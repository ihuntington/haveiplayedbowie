'use strict';

const process = require('process');
const Path = require('path');
const Hapi = require('@hapi/hapi');
const CatboxRedis = require("@hapi/catbox-redis");

const plugins = require('./plugins');
const { sessionValidator } = require('./validators/session');
const { getTopArtists } = require("./services/charts");
const Spotify = require("./library/spotify");

let server = null;

const getArtistsFromSpotify = async ({ ids }) => {
    const spotify = new Spotify();
    return await spotify.getArtists(ids);
}

const setup = async () => {
    server = Hapi.server({
        port: process.env.PORT || 8080,
        host: '0.0.0.0',
        cache: [
            {
                name: "redis_cache",
                provider: {
                    constructor: CatboxRedis,
                    options: {
                        partition: "bowie",
                        host: "localhost",
                        port: 6379,
                    }
                }
            }
        ]
    });

    server.method("artists.chart", getTopArtists, {
        cache: {
            cache: "redis_cache",
            generateTimeout: 2000,
            expiresIn: 1000 * 60,
            getDecoratedValue: true,
        },
        generateKey: ({ date, period }) => {
            return `artists-chart-${period}-${date}`;
        },
    });

    server.method("spotify.artists", getArtistsFromSpotify, {
        cache: {
            cache: "redis_cache",
            generateTimeout: 30000,
            expiresIn: 1000 * 60,
            getDecoratedValue: true,
        },
        generateKey: ({ ids }) => {
            return `spotify-artists-${ids.join("-")}`;
        },
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
            // Always set to true now even for local development is over HTTPS
            isSecure: true,
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
    server.register([plugins.listens]);
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

    server.route({
        method: 'GET',
        path: '/about',
        handler: (_, h) => h.view('about'),
    });

    server.route({
        method: 'GET',
        path: '/bookmarklet/{param*}',
        options: {
            handler: {
                directory: {
                    path: Path.join(__dirname, 'bookmarklet'),
                    redirectToSlash: true,
                },
            },
            cors: {
                origin: ["https://www.bbc.co.uk"],
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
