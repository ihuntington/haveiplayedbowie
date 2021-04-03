'use strict';

const Boom = require('@hapi/boom');
const Joi = require('joi');
const endOfYear = require('date-fns/endOfYear');
const startOfYear = require('date-fns/startOfYear');

const artistsPlugin = {
    name: 'artistsPlugin',
    register: async (server) => {
        const { db } = server.app;

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
                        from: Joi.date().iso(),
                        to: Joi.date().iso(),
                    })
                    .and('from', 'to'),
                },
                handler: async (request) => {
                    const { aid } = request.params;
                    let { from, to } = request.query;

                    if (!from) {
                        from = startOfYear(Date.now());
                    }

                    if (!to) {
                        to = endOfYear(Date.now());
                    }

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
                        return Boom.badRequest();
                    }
                }
            }
        });
    },
};


module.exports = artistsPlugin;
