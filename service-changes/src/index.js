'use strict';

const process = require('process');
const Hapi = require('@hapi/hapi');

async function start() {
    const server = Hapi.server({
        host: '0.0.0.0',
        port: process.env.PORT || 3010,
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: () => {
            return 'Ok';
        },
    });

    await server.start();

    console.log('Server running at %s', server.info.uri);
}

start();