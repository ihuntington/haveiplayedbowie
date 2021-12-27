import Boom from '@hapi/boom';
import Joi from 'joi';
import formatISO from 'date-fns/formatISO';
import { getTruncatedDate } from '../utils/dates';

export const scrobblesPlugin = {
    name: 'scrobbles',
    register: async (server) => {
        const { db } = server.app;

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
    },
};
