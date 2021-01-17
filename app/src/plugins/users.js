'use strict';

const Joi = require('joi');
const routes = require('../routes');

const plugin = {
    name: 'app/users',
    register: async (server) => {
        server.route({
            method: 'GET',
            path: '/u/{username}/diary',
            config: {
                auth: {
                    strategy: 'session',
                    mode: 'optional',
                },
                handler: routes.users.diary,
                validate: {
                    params: Joi.object({
                        username: Joi.string().min(2).max(50),
                    }),
                    query: Joi.object({
                        date: Joi.date().iso().max('now'),
                    }),
                },
            },
        });
    },
};

module.exports = plugin;
