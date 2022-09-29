import process from 'process';
import Hapi from '@hapi/hapi';
import * as plugins from './plugins';

let server;

async function setup() {
    server = Hapi.server({
        host: '0.0.0.0',
        port: process.env.PORT || 3030,
    });

    await server.register([plugins.dbPlugin]);
    await server.register([plugins.artistsPlugin]);
    await server.register([plugins.chartsPlugin]);
    await server.register([plugins.scrobblesPlugin]);
    await server.register([plugins.tracksPlugin]);
    await server.register([plugins.usersPlugin]);

    return server;
}

export async function start() {
    await setup();
    await server.start();
    console.log(`Server running at ${server.info.uri}`);
    return server;
}
