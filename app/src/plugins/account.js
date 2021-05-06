'use strict';

const process = require('process');
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

        server.route({
            method: 'GET',
            path: "/account/bookmark",
            handler: (_, h) => {
                return h.view('account/bookmark', { APP_URL: process.env.APP_URL });
            },
        });
    },
};

module.exports = plugin;
