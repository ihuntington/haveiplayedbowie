'use strict';

const process = require('process');
const Hapi = require('@hapi/hapi');
const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const { Sequelize, Op } = require('sequelize');

const sequelize = require('./sequelize')
const { Artist, Scrobble, Track, User } = require('./models')
const { scrobble } = require('./controllers')

let server;

async function setup() {
    // Connect to Postgres
    // db.connect();
    await sequelize.authenticate();

    server = Hapi.server({
        host: '0.0.0.0',
        port: process.env.PORT || 5000,
    });

    server.route({
        method: 'GET',
        path: '/scrobbles',
        options: {
            handler: async (request) => {
                const { username, date } = request.query;

                let scrobbles = [];

                try {
                    const user = await User.findOne({
                        attributes: ['id'],
                        where: {
                            username,
                        },
                    });

                    scrobbles = await Scrobble.findAll({
                        attributes: ['id', 'played_at', 'user_id'],
                        where: {
                            [Op.and]: [
                                Sequelize.where(
                                    Sequelize.cast(Sequelize.col('played_at'), 'date'),
                                    date
                                ),
                                { user_id: user.id }
                            ]
                        },
                        include: [
                            {
                                model: Track,
                                include: {
                                    model: Artist,
                                    attributes: ['id', 'name'],
                                    through: {
                                        attributes: ['artist_order'],
                                    },
                                },
                            },
                        ],
                    });
                } catch (e) {
                    console.log("Could not fetch scrobbles for user", username);
                    console.error(e);
                    return Boom.badRequest();
                }

                return {
                    scrobbles,
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
                const { user, items } = request.payload;
                const scrobbles = [];
                console.log(`Received ${items.length} scrobbles`);

                for (const item of items) {
                    console.log(`Add scrobbles for user ${user}`);

                    try {
                        const result = await scrobble.insertScrobbleFromSpotify(user, item);

                        scrobbles.push(result.id)
                    } catch (e) {
                        console.log(`Unable to add scrobbles for user ${user}`);
                        console.log(e);
                        scrobbles.push(null);
                    }
                }

                // await db.updateRecentlyPlayed(user);

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
                let users = []

                try {
                    users = await User.findAll({
                        where: {
                            ...request.query,
                        },
                        attributes: {
                            exclude: ['token', 'refresh_token']
                        }
                    })
                } catch (err) {
                    console.error('User.getByUsername', err);
                }

                return { users };
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
                    const newUser = {
                        ...payload,
                        refresh_token: refreshToken,
                    };

                    const result = await User.create(newUser);

                    return h.response(result).code(201);
                } catch (e) {
                    console.error('User.create', e)
                    return Boom.badRequest()
                }
            },
        },
    });

    server.route({
        method: 'PATCH',
        path: '/users/{uid}',
        options: {
            handler: async (request, h) => {
                let user = null;

                try {
                    user = await User.update({
                        ...request.payload
                    }, {
                        where: {
                            id: request.params.uid,
                        },
                    });

                    return h.response(user).code(204);
                } catch (err) {
                    console.error('User.update', err);
                    return Boom.badRequest();
                }
            },
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
        },
    });

    server.route({
        method: 'GET',
        path: '/users/recently-played',
        options: {
            handler: async () => {
                let users = [];

                try {
                    users = await User.findAll({
                        attributes: ['id', 'token', 'refresh_token'],
                        where: {
                            recently_played_at: {
                                [Op.or]: {
                                    [Op.lt]: Sequelize.literal("now() - interval '6 minutes'"),
                                    [Op.eq]: null,
                                },
                            },
                        },
                    });
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
    await setup();
    await server.start();
    console.log(`Server running at ${server.info.uri}`);
    return server;
};
