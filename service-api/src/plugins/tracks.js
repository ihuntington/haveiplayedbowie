'use strict';

const Boom = require('@hapi/boom');
const Joi = require('joi');

const tracksPlugin = {
    name: 'tracks',
    register: async (server) => {
        const { db } = server.app;

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
    },
};

module.exports = tracksPlugin;
