'use strict';

const process = require('process');
const Path = require('path');
const Hapi = require('@hapi/hapi');
const Boom = require('@hapi/boom');

const plugins = require('./plugins');
const services = require('./services');
const Spotify = require('./library/spotify');
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
        forceHttps: process.env.NODE_ENV === 'production',
        isSecure: process.env.NODE_ENV === 'production',
        location: process.env.APP_URL,
        scope: ['user-read-email', 'user-read-recently-played']
    });

    server.register([plugins.account]);
    server.register([plugins.artists]);
    server.register([plugins.auth]);
    server.register([plugins.charts]);
    server.register([plugins.home]);
    // server.register([plugins.listens]);
    server.register([plugins.tracks]);
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
        method: 'POST',
        path: '/api/listens',
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
            handler: async (request, h) => {
                // return request.payload;
                const { played_at, segment }  = request.payload;
                const spotify = new Spotify();

                let trackId = null;
                let track = null;

                if (segment.uris && segment.uris.length) {
                    const service = segment.uris.find((service) => {
                        return service.id === "commercial-music-service-spotify";
                    });

                    if (service) {
                        trackId = Spotify.extractTrackId(service.uri);
                    }
                }

                if (trackId) {
                    track =  await spotify.getTrackById(trackId);
                }

                // TODO if not found on spotify
                if (track) {
                    const user = request.auth.credentials.id;
                    const listen = await services.scrobbles.add(user, played_at, track);

                    if (listen) {
                        return h.response().code(201);
                    }
                }
            },
            cors: {
                origin: [process.env.APP_CORS_ORIGIN],
                credentials: true,
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
