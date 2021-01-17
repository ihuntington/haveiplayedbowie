'use strict';

const process = require('process');
const Path = require('path');
const Hapi = require('@hapi/hapi');
const Boom = require('@hapi/boom');
const Joi = require('joi');
const formatISO = require('date-fns/formatISO');

const services = require('./services');
const routes = require('./routes');
const plugins = require('./plugins');
const { sessionValidator } = require('./validators/session');

let server = null;

const setup = async () => {
    server = Hapi.server({
        port: process.env.PORT || 8080,
        host: '0.0.0.0',
    });

    await server.register(require('@hapi/inert'));
    await server.register(require('@hapi/vision'));
    await server.register(require('@hapi/cookie'));
    await server.register(require('@hapi/bell'));

    server.views({
        engines: {
            hbs: {
                module: require('handlebars'),
                isCached: process.env.NODE_ENV === 'production',
            },
        },
        relativeTo: __dirname,
        path: './view/templates',
        layout: true,
        layoutPath: './view/templates/layouts',
        helpersPath: './view/helpers',
        partialsPath: './view/partials',
    });

    server.auth.strategy('session', 'cookie', {
        cookie: {
            name: 'sid',
            password: process.env.COOKIE_PASSWORD,
            isSecure: process.env.NODE_ENV === 'production',
            path: '/',
            isSameSite: "None",
            isHttpOnly: false,
        },
        redirectTo: '/login',
        validateFunc: sessionValidator,
    });

    server.auth.strategy('spotify', 'bell', {
        provider: 'spotify',
        password: process.env.SPOTIFY_COOKIE_PASSWORD,
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        // App engine runs as non-https
        forceHttps: process.env.NODE_ENV === 'production',
        isSecure: process.env.NODE_ENV === 'production',
        location: process.env.APP_URL,
        scope: ['user-read-email', 'user-read-recently-played']
    });

    server.register([plugins.listens]);
    server.register([plugins.users]);

    // TODO: route only available not in production
    server.route({
        method: 'GET',
        path: '/assets/{param*}',
        handler: {
            directory: {
                path: Path.join(__dirname, 'assets')
            }
        }
    });

    // TODO: route only available not in production
    server.route({
        method: 'GET',
        path: '/bookmarklet/{param*}',
        handler: {
            directory: {
                path: Path.join(__dirname, 'bookmarklet')
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/tracks/{track}',
        handler: routes.track,
    });

    server.route({
        method: 'GET',
        path: '/artists/{artist}',
        handler: routes.artist,
        options: {
            validate: {
                query: Joi.object({
                    from: Joi.date().iso(),
                    to: Joi.date().iso(),
                }),
            },
        },
    });

    server.route({
        method: 'GET',
        path: '/charts',
        handler: routes.charts,
    });

    server.route({
        method: 'GET',
        path: '/charts/{year}/{month?}',
        handler: routes.charts,
    });

    server.route({
        method: ['GET', 'POST'],
        path: '/auth/spotify',
        options: {
            auth: 'spotify',
            handler: routes.auth.spotifyAuth,
        },
    });

    server.route({
        method: 'GET',
        path: '/login',
        options: {
            auth: {
                mode: 'try',
                strategy: 'session',
            },
            plugins: {
                // If a default server strategy was set then here the strategy
                // options can be overridden.
                'hapi-auth-cookie': {
                    // Remove redirection to stop infinite loop
                    redirectTo: false,
                },
            },
            handler: routes.auth.login,
        },
    });

    server.route({
        method: 'GET',
        path: '/logout',
        handler: routes.auth.logout,
    });

    server.route({
        method: 'GET',
        path: '/account/username',
        options: {
            auth: {
                strategy: 'session',
                mode: 'required',
            },
            handler: routes.account.getUsername,
        },
    });

    server.route({
        method: 'POST',
        path: '/account/username',
        options: {
            auth: {
                strategy: 'session',
                mode: 'required',
            },
            handler: routes.account.postUsername,
            validate: {
                payload: Joi.object({
                    username: Joi.string().min(2).max(50),
                }),
            },
        },
    });

    server.route({
        method: 'GET',
        path: '/about',
        handler: (request, h) => {
            return h.view('about');
        }
    });

    server.route({
        method: 'GET',
        path: '/s/{token}/bookmarklet',
        options: {
            handler: (request, h) => {
                if (request.params.token !== 'abc123') {
                    return Boom.unauthorized();
                }
                console.log(__dirname);
                return h.file('./bookmarklet/sounds.js', { confine: false });
            },
            files: {
                relativeTo: __dirname,
            },
        },
    });

    server.route({
        method: 'GET',
        path: '/test',
        options: {
            auth: {
                strategy: 'session',
                mode: 'required',
            },
            plugins: {
                'hapi-auth-cookie': {
                    // disable redirect to /login for an API route
                    redirectTo: false,
                },
            },
            handler: (request, h) => {
                const { segment } = request.query;
                try {
                    const buff = Buffer.from(segment, 'base64');
                    const result = JSON.parse(buff.toString('utf-8'));
                    return result;
                } catch (err) {
                    console.log(err);
                    return h.response().code(400);
                }
            }
        }
    })

    server.route({
        method: 'GET',
        path: '/',
        options: {
            auth: {
                strategy: 'session',
                mode: 'optional',
            },
            handler: async (request, h) => {
                const today = request.query.date || formatISO(new Date(), { representation: 'date' });
                const periods = ['day', 'week', 'month', 'year'];

                const tracks = await Promise.all(periods.map(period => {
                    return services.scrobbles.getTotalByDate({
                        column: 'track',
                        date: today,
                        period,
                    });
                }));

                const durations = await Promise.all(periods.map(period => {
                    return services.scrobbles.getDurationByPeriod({
                        date: today,
                        period,
                    });
                }));

                const bowie = await Promise.all(periods.map(period => {
                    return services.scrobbles.getTotalByDate({
                        artist: process.env.BOWIE_ARTIST_ID,
                        date: today,
                        period,
                    });
                }));

                const topTracks = await services.charts.getTopTracks({
                    date: today,
                    period: 'week',
                });

                const topArtists = await services.charts.getTopArtists({
                    date: today,
                    period: 'week',
                });

                const data = {
                    totals: {
                        bowie,
                        durations,
                        tracks,
                    },
                    topTracks,
                    topArtists,
                };

                if (request.auth.isAuthenticated) {
                    return h.view('index', {
                        auth: {
                            isAuthenticated: true,
                            name: request.auth.credentials.profile.displayName,
                            username: request.auth.credentials.username,
                        },
                        ...data,
                    });
                }

                return h.view('index', {
                    ...data,
                });
            },
            validate: {
                query: Joi.object({
                    date: Joi.string().isoDate(),
                }),
            },
        },
    });

    return server;
};


exports.init = async () => {
    await setup();
    await server.initialize();
    return server;
};

exports.start = async () => {
    await setup();
    await server.start();
    console.log('Server running on %s', server.info.uri);
    return server;
};

process.on('unhandledRejection', (err) => {
    console.log(err);
});
