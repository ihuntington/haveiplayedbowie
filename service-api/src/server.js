'use strict';

const process = require('process');
const Hapi = require('@hapi/hapi');
const Joi = require('@hapi/joi');
const db = require('./db');

let server;

function setup() {
    // Connect to Postgres
    db.connect();

    server = Hapi.server({
        host: '0.0.0.0',
        port: process.env.PORT || 5000,
    });

    server.route({
        method: 'GET',
        path: '/scrobbles',
        options: {
            handler: async (request, h) => {
                const { username, date } = request.query;

                try {
                    const scrobbles = await db.getScrobbles(username, date);
                    return { scrobbles };
                } catch (e) {
                    console.log("Could not fetch scrobbles for user", username);
                    console.error(e);
                    return h.response().code(400);
                }
            },
            validate: {
                query: Joi.object({
                    username: Joi.string().required().min(2).max(50),
                    date: Joi.date().required().iso().max('now'),
                }),
            },
        },
    });

    server.route({
        method: 'POST',
        path: '/scrobbles',
        options: {
            handler: async (request, h) => {
                const { items } = request.payload;
                const results = [];

                for (const item of items) {
                    try {
                        const scrobble = await db.insertScrobbleFromSpotify('7ecf533d-0f4d-4def-86d6-c58d3258870f', item);
                        results.push(scrobble.id)
                    } catch (e) {
                        console.log(e);
                        results.push(null);
                    }

                }

                return { results };
            }
        }
    })

    return server;
}

exports.start = async () => {
    setup();
    await server.start();
    console.log(`Server running at ${server.info.uri}`);
    return server;
};
