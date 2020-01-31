'use strict';

const process = require('process');

if (process.env.NODE_ENV === 'production') {
  require('@google-cloud/debug-agent').start();
}

const Path = require('path');
const Hapi = require('@hapi/hapi');
const routes = require('./routes');

async function start() {
    const server = Hapi.server({
        port: process.env.PORT || 3000,
        host: '0.0.0.0',
    });

    await server.register(require('@hapi/inert'));
    await server.register(require('@hapi/vision'));

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
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return h.view('index');
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
}

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

start();
