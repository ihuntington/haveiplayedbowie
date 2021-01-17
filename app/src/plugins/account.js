'use strict';

const Joi = require('joi');
const routes = require('../routes');

const plugin = {
    name: 'app/account',
    register: async (server) => {
        server.route({
            method: 'GET',
            path: '/account/username',
            options: {
                auth: {
                    strategy: 'session',
                    mode: 'required',
                },
                handler: routes.account.getUsername,
            },
        });

        server.route({
            method: 'POST',
            path: '/account/username',
            options: {
                auth: {
                    strategy: 'session',
                    mode: 'required',
                },
                handler: routes.account.postUsername,
                validate: {
                    payload: Joi.object({
                        username: Joi.string().min(2).max(50),
                    }),
                },
            },
        });
    },
};

module.exports = plugin;
