import Boom from '@hapi/boom';
import Joi from 'joi';

export const usersPlugin = {
    name: 'users',
    register: async (server) => {
        const { db } = server.app;

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
    },
};
