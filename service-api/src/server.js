'use strict';

const process = require('process');
const Hapi = require('@hapi/hapi');
const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
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
                const { user, items } = request.payload;
                const scrobbles = [];
                console.log(`Received ${items.length} scrobbles`);

                for (const item of items) {
                    console.log(`Add scrobbles for user ${user}`);

                    try {
                        const result = await db.insertScrobbleFromSpotify(user, item);

                        scrobbles.push(result.id)
                    } catch (e) {
                        console.log(`Unable to add scrobbles for user ${user}`);
                        console.log(e);
                        scrobbles.push(null);
                    }
                }

                await db.updateRecentlyPlayed(user);

                return { scrobbles };
            }
        }
    });

    server.route({
        method: 'PATCH',
        path: '/users/{uid}',
        options: {
            handler: async (request, h) => {
                const { uid } = request.params;

                try {
                    await db.updateUserTokens(uid, request.payload);
                } catch (e) {
                    console.log('Unable to update user');
                    console.error(e);
                    return Boom.badRequest();
                }

                return h.response().code(204);
            },
            validate: {
                params: Joi.object({
                    uid: Joi.string().required().min(2).max(50),
                }),
                payload: Joi.object({
                    token: Joi.string(),
                    refresh_token: Joi.string(),
                }),
            },
        },
    });

    server.route({
        method: 'GET',
        path: '/users/recently-played',
        options: {
            handler: async (request, h) => {
                let users = [];

                try {
                    users = await db.getUsersByRecentlyPlayed();
                } catch (error) {
                    console.log('Unable to get users by recently played');
                    console.error(error);
                }

                return { users };
            }
        }
    });

    return server;
}

exports.start = async () => {
    setup();
    await server.start();
    console.log(`Server running at ${server.info.uri}`);
    return server;
};
