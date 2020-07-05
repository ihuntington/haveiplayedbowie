'use strict';

const process = require('process');
const Hapi = require('@hapi/hapi');
const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const addDays = require('date-fns/addDays');
const formatISO = require('date-fns/formatISO');
const isToday = require('date-fns/isToday');
const qs = require('query-string');
const db = require('./db');

let server;

const formatDate = (date) => {
    return formatISO(date, { representation: "date" });
};

const formatLink = (url, query) => {
    return qs.stringifyUrl({ url, query });
};

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
                const { origin, pathname } = request.url;
                const url = `${origin}${pathname}`;
                const { username, date } = request.query;
                const previousDate = addDays(date, -1);
                const nextDate = addDays(date, 1);
                const links = {
                    previous: formatLink(url, { date: formatDate(previousDate), username }),
                    next: isToday(date) ? null : formatLink(url, { date: formatDate(nextDate), username }),
                };

                let items = [];

                try {
                    items = await db.getScrobbles(username, date);
                } catch (e) {
                    console.log("Could not fetch scrobbles for user", username);
                    console.error(e);
                    return h.response().code(400);
                }

                return {
                    items,
                    links,
                };
            },
            validate: {
                query: Joi.object({
                    username: Joi.string().required().min(2).max(50),
                    date: Joi.date().required().iso(),
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
        method: 'GET',
        path: '/users',
        options: {
            validate: {
                query: Joi.object({
                    id: Joi.string().guid({ version: ['uuidv4'] }),
                    email: Joi.string().email(),
                    username: Joi.string().min(2).max(50),
                }).oxor('email', 'username', 'id'),
            },
            handler: async (request) => {
                let records = [];

                try {
                    records = await db.findUserBy({ ...request.query }, ['email', 'id', 'profile']);
                } catch (e) {
                    console.log('Could not find user');
                }

                return records;
            },
        },
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

    server.route({
        method: 'GET',
        path: '/_health',
        handler: () => {
            return 'ok';
        },
    });

    return server;
}

exports.start = async () => {
    setup();
    await server.start();
    console.log(`Server running at ${server.info.uri}`);
    return server;
};
