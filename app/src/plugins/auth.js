'use strict'

const routes = require('../routes');

const plugin = {
    name: 'app/auth',
    register: async (server) => {
        server.route({
            method: ['GET', 'POST'],
            path: '/auth/spotify',
            options: {
                auth: 'spotify',
                handler: routes.auth.spotifyAuth,
            },
        });

        server.route({
            method: 'GET',
            path: '/login',
            options: {
                auth: {
                    mode: 'try',
                    strategy: 'session',
                },
                plugins: {
                    // If a default server strategy was set then here the strategy
                    // options can be overridden.
                    'hapi-auth-cookie': {
                        // Remove redirection to stop infinite loop
                        redirectTo: false,
                    },
                },
                handler: routes.auth.login,
            },
        });

        server.route({
            method: 'GET',
            path: '/logout',
            handler: routes.auth.logout,
        });
    },
};

module.exports = plugin;
