import process from 'process';
import Hapi from '@hapi/hapi';
import Boom from '@hapi/boom';
import * as plugins from './plugins';

let server;

function simpleAuthScheme() {
    return {
        authenticate: function (request, h) {
            const req = request.raw.req;
            const authorization = req.headers.authorization;

            if (authorization !== process.env.SERVER_AUTH) {
                throw Boom.unauthorized(null, "simple");
            }

            return h.authenticated({
                credentials: {
                    user: "developer",
                },
            });
        }
    }
}

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
    
    server.auth.scheme("simple", simpleAuthScheme);
    server.auth.strategy("default", "simple");

    if (process.env.NODE_ENV === "production") {
        server.auth.default("default");
    }

    return server;
}

export async function start() {
    await setup();
    await server.start();
    console.log(`Server running at ${server.info.uri}`);
    return server;
}
