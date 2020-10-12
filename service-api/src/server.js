'use strict';

const process = require('process');
const Hapi = require('@hapi/hapi');
const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const endOfYear = require('date-fns/endOfYear');
const formatISO = require('date-fns/formatISO');

const { db } = require('./dbx');

let server;

const getEndOfYear = () => {
    return formatISO(endOfYear(new Date()), {
        representation: 'date',
    });
};

async function setup() {

    server = Hapi.server({
        host: '0.0.0.0',
        port: process.env.PORT || 5000,
    });

    server.route({
        method: 'GET',
        path: '/artists/{aid}/summary',
        options: {
            validate: {
                params: Joi.object({
                    aid: Joi.number().required(),
                }),
                query: Joi.object({
                    from: Joi.date().iso().required(),
                    to: Joi.date().iso().max(getEndOfYear()).required(),
                })
                .and('from', 'to'),
            },
            handler: async (request) => {
                const { aid } = request.params;
                const { from, to } = request.query;

                try {
                    const data = await db.artists.getSummary(aid, from, to);

                    return {
                        dates: {
                            from,
                            to,
                        },
                        ...data,
                    };
                } catch (err) {
                    console.log(err);
                    return Boom.badRequest();
                }
            }
        }
    })

    server.route({
        method: 'GET',
        path: '/scrobbles',
        options: {
            handler: async (request) => {
                const { username, date } = request.query;

                let items = [];

                try {
                    const user = await db.users.findByUsername(username);
                    items = await db.scrobbles.find({ uid: user.id, date });
                } catch (e) {
                    console.log("Could not fetch scrobbles for user", username);
                    console.error(e);
                    return Boom.badRequest();
                }

                return {
                    items,
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
            handler: async (request) => {
                const { items } = request.payload;
                const scrobbles = [];

                let user;

                try {
                    user = await db.users.findById(request.payload.user);
                } catch (err) {
                    console.log(err);

                    return Boom.badRequest('User does not exist');
                }

                console.log(`Received ${items.length} scrobbles for user ${user.id}`);

                for (const item of items) {
                    try {
                        const result = await db.scrobbles.add(user.id, item);
                        scrobbles.push(result.id);
                    } catch (err) {
                        console.log(err);
                        scrobbles.push(null);
                    }
                }

                const createdScrobbles = scrobbles.filter(Boolean);

                console.log(`Successfully added ${createdScrobbles.length} of ${items.length} scrobbles received for user ${user.id}`);

                try {
                    db.users.updateRecentlyPlayed(user.id);
                } catch (err) {
                    console.log(`Unable to update recently_played_at for user ${user.id}`);
                    console.error(err);
                }

                return { items: scrobbles };
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
                try {
                    const data = await db.users.find(request.query);

                    return { data };
                } catch (err) {
                    console.error('Unable to find users', err);
                    return Boom.badRequest();
                }
            },
        },
    });

    server.route({
        method: 'GET',
        path: '/users/{uid}',
        options: {
            validate: {
                params: Joi.object({
                    uid: Joi.string().required().guid({ version: ['uuidv4'] }),
                }),
            },
            handler: async (request) => {
                try {
                    const user = await db.users.findById(request.params.uid);

                    if (!user) {
                        return Boom.notFound();
                    }

                    return user;
                } catch (err) {
                    console.log(`Unable to find user ${request.params.uid}`);
                    console.error(err);
                    return Boom.badImplementation();
                }
            },
        },
    });

    server.route({
        method: 'POST',
        path: '/users',
        options: {
            validate: {
                payload: Joi.object({
                    email: Joi.string().email().required(),
                    token: Joi.string().required(),
                    refreshToken: Joi.string().required(),
                    profile: Joi.object({
                        displayName: Joi.string().required(),
                        id: Joi.string().required(),
                        username: Joi.string().required(),
                    }),
                }),
            },
            handler: async (request, h) => {
                const { refreshToken, ...payload } = request.payload;

                try {
                    const user = {
                        ...payload,
                        refresh_token: refreshToken,
                    };

                    const data = await db.users.add(user);

                    return h.response(data).code(201);
                } catch (e) {
                    // TODO: what way to send that the email address is taken
                    console.error('Unable to add new user', e);
                    return Boom.badImplementation();
                }
            },
        },
    });

    server.route({
        method: 'PATCH',
        path: '/users/{uid}',
        options: {
            validate: {
                params: Joi.object({
                    uid: Joi.string().required().guid({ version: ['uuidv4'] }),
                }),
                payload: Joi.object({
                    token: Joi.string(),
                    refresh_token: Joi.string(),
                    username: Joi.string().min(2).max(50),
                }).without('username', ['token', 'refresh_token']).and('token', 'refresh_token'),
            },
            handler: async (request, h) => {
                try {
                    await db.users.update(request.params.uid, request.payload);

                    return h.response().code(204);
                } catch (err) {
                    console.error('User.update', err);
                    return Boom.badRequest();
                }
            },
        },
    });

    server.route({
        method: 'GET',
        path: '/users/recently-played',
        options: {
            handler: async () => {
                let users = [];

                try {
                    users = await db.users.findByRecentlyPlayed();
                } catch (error) {
                    console.log('Unable to get users by recently played');
                    console.error(error);
                    return Boom.badRequest();
                }

                return { users };
            }
        }
    });

    return server;
}

exports.start = async () => {
    await setup();
    await server.start();
    console.log(`Server running at ${server.info.uri}`);
    return server;
};
