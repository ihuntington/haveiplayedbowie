'use strict';

const process = require('process');
const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const Boom = require('@hapi/boom');
const startOfYear = require('date-fns/startOfYear');
const startOfMonth = require('date-fns/startOfMonth');
const startOfWeek = require('date-fns/startOfWeek');
const endOfYear = require('date-fns/endOfYear');
const formatISO = require('date-fns/formatISO');

const { db } = require('./db');

let server;

const getEndOfYear = () => {
    return formatISO(endOfYear(new Date()), {
        representation: 'date',
    });
};

const getTruncatedDate = (date, period) => {
    if (period === 'year') {
        return startOfYear(date);
    }

    if (period === 'month') {
        return startOfMonth(date);
    }

    if (period === 'week') {
        return startOfWeek(date, { weekStartsOn: 1 });
    }

    return date;
};

async function setup() {

    server = Hapi.server({
        host: '0.0.0.0',
        port: process.env.PORT || 5000,
    });

    server.route({
        method: 'GET',
        path: '/artists/{aid}',
        handler: async (request) => {
            const { aid } = request.params;

            try {
                const data = await db.artists.findById(aid);
                return {
                    ...data,
                };
            } catch (err) {
                console.log(err);
                return Boom.badRequest();
            }
        },
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
    });

    server.route({
        method: 'GET',
        path: '/charts',
        options: {
            handler: async (request) => {
                const { year, month, username, limit } = request.query;
                const present = new Date();

                let from = new Date(year || present.getUTCFullYear(), 0);
                let to = new Date(from.getUTCFullYear() + 1, 0);

                const query = { from, to, limit };

                if (month) {
                    from.setMonth(month > 0 ? month - 1 : 0);
                    to = new Date(from.getUTCFullYear(), from.getMonth() + 1);
                    query.to = to;
                }

                if (username) {
                    query.username = username;
                }

                if (from.getUTCFullYear() > present.getUTCFullYear()) {
                    return h.response().code(400);
                }

                try {
                    const result = await db.scrobbles.getCharts(query);
                    return result;
                } catch (err) {
                    console.error(err);
                    return Boom.badImplementation();
                }
            },
            validate: {
                query: Joi.object({
                    year: Joi.number(),
                    month: Joi.number(),
                    username: Joi.string().min(2),
                    limit: Joi.number().min(1).max(50).default(10),
                }),
            },
        },
    });

    server.route({
        method: 'GET',
        path: '/charts/artists',
        options: {
            handler: async (request) => {
                const { date, year, month, period, username, limit } = request.query;
                const allowedPeriod = ['year', 'month', 'week', 'day'];
                const present = new Date();

                if (period && !allowedPeriod.includes(period)) {
                    return Boom.badRequest(`Period must be one of ${allowedPeriod.join(', ')}`);
                }

                let from = new Date(year || present.getUTCFullYear(), 0);
                let to = new Date(from.getUTCFullYear() + 1, 0);

                if (month) {
                    from.setMonth(month > 0 ? month - 1 : 0);
                    to = new Date(from.getUTCFullYear(), from.getMonth() + 1);
                }

                const query = {
                    limit,
                    ...(date && { date: getTruncatedDate(date, period) }),
                    ...(period && { period }),
                    ...(year && { from, to }),
                };

                if (username) {
                    query.username = username;
                }

                if (from.getUTCFullYear() > present.getUTCFullYear()) {
                    return h.response().code(400);
                }

                try {
                    const items = await db.scrobbles.getTopArtists(query);
                    return { items };
                } catch (err) {
                    console.error(err);
                    return Boom.badImplementation();
                }
            },
            validate: {
                query: Joi.object({
                    date: Joi.date().iso(),
                    year: Joi.number(),
                    month: Joi.number(),
                    // TODO: period should check the values
                    period: Joi.string(),
                    username: Joi.string().min(2),
                    limit: Joi.number().min(1).max(50).default(10),
                }).without('date', ['year', 'month']).and('date', 'period'),
            },
        },
    });

    server.route({
        method: 'GET',
        path: '/charts/tracks',
        options: {
            handler: async (request) => {
                const { artist, date, period, year, month, username, limit } = request.query;
                const allowedPeriod = ['year', 'month', 'week', 'day'];
                const present = new Date();

                if (period && !allowedPeriod.includes(period)) {
                    return Boom.badRequest(`Period must be one of ${allowedPeriod.join(', ')}`);
                }

                let from = new Date(year || present.getUTCFullYear(), 0);
                let to = new Date(from.getUTCFullYear() + 1, 0);

                // const query = { from, to, limit };

                if (month) {
                    from.setMonth(month > 0 ? month - 1 : 0);
                    to = new Date(from.getUTCFullYear(), from.getMonth() + 1);
                    // query.to = to;
                }

                const query = {
                    limit,
                    ...(date && { date: getTruncatedDate(date, period) }),
                    ...(period && { period }),
                    ...(year && { from, to }),
                };

                if (username) {
                    query.username = username;
                }

                if (artist) {
                    query.artist = artist;
                }

                if (from.getUTCFullYear() > present.getUTCFullYear()) {
                    return h.response().code(400);
                }

                try {
                    const items = await db.scrobbles.getTopTracks(query);
                    return { items };
                } catch (err) {
                    console.error(err);
                    return Boom.badImplementation();
                }
            },
            validate: {
                query: Joi.object({
                    artist: Joi.number(),
                    date: Joi.date().iso(),
                    limit: Joi.number().min(1).max(50).default(10),
                    month: Joi.number(),
                    // TODO: period should check the values
                    period: Joi.string(),
                    username: Joi.string().min(2).max(50),
                    year: Joi.number().max(new Date().getUTCFullYear()),
                }).without('date', ['year', 'month']).and('date', 'period'),
            },
        },
    });

    server.route({
        method: 'GET',
        path: '/scrobbles/duration',
        options: {
            handler: async (req) => {
                const { date, period } = req.query;
                const allowedPeriod = ['year', 'month', 'week', 'day'];

                if (period && !allowedPeriod.includes(period)) {
                    return Boom.badRequest(`Period must be one of ${allowedPeriod.join(', ')}`);
                }

                const query = {
                    ...req.query,
                    date: getTruncatedDate(date, period),
                    period,
                };

                try {
                    const duration = await db.scrobbles.getTotalDurationByDate(query);
                    return {
                        duration,
                        date: getTruncatedDate(date, period),
                        period,
                    };
                } catch (err) {
                    console.log('Could not get scrobbles duration');
                    console.error(err);
                    return Boom.badImplementation();
                }
            },
            validate: {
                query: Joi.object({
                    date: Joi.date().iso().default(formatISO(new Date(), { representation: 'date' })),
                    period: Joi.string().default('day'),
                    username: Joi.string().min(2).max(50),
                })
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/scrobbles/count',
        options: {
            handler: async (req) => {
                const { column, date, period } = req.query;
                const allowedColumns = ['artist', 'track'];
                const allowedPeriods = ['year', 'month', 'week', 'day'];

                if (column && !allowedColumns.includes(column)) {
                    return Boom.badRequest(`Column must be one of ${allowedColumns.join(', ')}`);
                }

                if (period && !allowedPeriods.includes(period)) {
                    return Boom.badRequest(`Period must be one of ${allowedPeriods.join(', ')}`);
                }

                const query = {
                    ...req.query,
                    column,
                    truncate: period,
                    ...(date && { date: getTruncatedDate(date, period) }),
                }

                try {
                    const total = await db.scrobbles.total(query);
                    return {
                        total,
                        ...(date && { date: getTruncatedDate(date, period )}),
                        ...(period && { period }),
                    };
                } catch (error) {
                    console.log('Could not get scrobbles.total');
                    console.error(error);
                    return Boom.badImplementation();
                }
            },
            validate: {
                query: Joi.object({
                    artist: Joi.number(),
                    column: Joi.string(),
                    distinct: Joi.boolean(),
                    from: Joi.date().iso(),
                    to: Joi.date().iso(),
                    date: Joi.date().iso(),
                    period: Joi.string(),
                    username: Joi.string().min(2).max(50),
                })
                .without('date', ['from', 'to']).and('date', 'period').and('from', 'to'),
            }
        }
    });

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

    server.route({
        method: 'GET',
        path: '/tracks/{tid}',
        options: {
            handler: async (request) => {
                const { tid } = request.params;

                try {
                    const track = await db.tracks.get(tid);
                    return track;
                } catch (err) {
                    console.error(err);
                    return Boom.badRequest();
                }
            },
            validate: {
                params: Joi.object({
                    tid: Joi.number(),
                }),
            },
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
