import Boom from'@hapi/boom';
import Joi from'joi';
import { getTruncatedDate } from'../utils/dates';

export const chartsPlugin = {
    name: 'chartsPlugin',
    register: async (server) => {
        const { db } = server.app;

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
                        // TODO: add min year = year of first scrobble from .env
                        year: Joi.number(),
                        // TODO: add default month is current
                        month: Joi.number().min(1).max(12),
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

                    // TODO: move this check to schema
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
    },
};
