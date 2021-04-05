'use strict';

const process = require('process');
const Hapi = require('@hapi/hapi');
const plugins = require('./plugins');

let server;

async function setup() {
    server = Hapi.server({
        host: '0.0.0.0',
        port: process.env.PORT || 5000,
    });

    await server.register([plugins.db]);
    await server.register([plugins.artists]);
    await server.register([plugins.charts]);
    await server.register([plugins.scrobbles]);
    await server.register([plugins.tracks]);
    await server.register([plugins.users]);

    return server;
}

async function start() {
    await setup();
    await server.start();
    console.log(`Server running at ${server.info.uri}`);
    return server;
}

module.exports = {
    start,
};
