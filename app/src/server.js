'use strict';

const process = require('process');
const Path = require('path');
const Hapi = require('@hapi/hapi');
const Joi = require('@hapi/joi');

const routes = require('./routes');
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
        // partialsPath: './view/partials',
    });

    server.auth.strategy('session', 'cookie', {
        cookie: {
            name: 'sid',
            password: process.env.COOKIE_PASSWORD,
            isSecure: process.env.NODE_ENV === 'production',
            path: '/',
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
        scope: ['user-read-email', 'user-read-recently-played']
    });

    // server.auth.default('session');

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

    server.route({
        method: 'GET',
        path: '/check',
        handler: () => 'ok',
    });

    server.route({
        method: 'GET',
        path: '/users/{user}/diary',
        config: {
            auth: {
                strategy: 'session',
                mode: 'optional',
            },
            handler: routes.users.diary,
            validate: {
                params: Joi.object({
                    user: Joi.string().min(2).max(50),
                }),
                query: Joi.object({
                    date: Joi.date().iso().max('now'),
                }),
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
        path: '/',
        options: {
            auth: {
                strategy: 'session',
                mode: 'optional',
            },
            handler: (request, h) => {
                if (request.auth.isAuthenticated) {
                    return h.view('index', {
                        auth: {
                            isAuthenticated: true,
                            name: request.auth.credentials.profile.displayName,
                            username: request.auth.credentials.username,
                        }
                    });
                }

                return h.view('index');
            }
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
