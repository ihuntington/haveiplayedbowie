'use strict';

const process = require('process');

if (process.env.NODE_ENV === 'production') {
    require('@google-cloud/debug-agent').start({
        allowExpressions: true,
    });
}

const Path = require('path');
const Hapi = require('@hapi/hapi');
const routes = require('./routes');
const db = require('./db');

async function start() {
    const server = Hapi.server({
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
        validateFunc: async (request, session) => {
            try {
                const account = await db.getUser(session.id);

                if (!account) {
                    return { valid: false };
                }

                return {
                    valid: true,
                    credentials: account,
                };
            } catch (err) {
                console.log('Session cookie validate error');
                console.error(err.stack);
                return { valid: false };
            }
        }
    });

    server.auth.strategy('spotify', 'bell', {
        provider: 'spotify',
        password: process.env.SPOTIFY_COOKIE_PASSWORD,
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
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
        path: '/diary',
        handler: routes.diary,
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
                        isAuthenticated: true,
                        name: request.auth.credentials.profile.displayName,
                    });
                }

                return h.view('index');
            }
        },
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
}

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

start();
