'use strict';

const routes = require('../routes');

const plugin = {
    name: 'app/charts',
    register: async (server) => {
        server.route({
            method: 'GET',
            path: '/charts',
            handler: routes.charts,
        });

        server.route({
            method: 'GET',
            path: '/charts/{year}/{month?}',
            handler: routes.charts,
        });
    },
};

module.exports = plugin;
