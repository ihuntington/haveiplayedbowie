'use strict';

const Joi = require('joi');
const routes = require('../routes');

const plugin = {
    name: 'app/artists',
    register: async (server) => {
        server.route({
            method: 'GET',
            path: '/artists/{artist}',
            handler: routes.artist,
            options: {
                validate: {
                    query: Joi.object({
                        from: Joi.date().iso(),
                        to: Joi.date().iso(),
                    }),
                },
            },
        });
    },
};

module.exports = plugin;
