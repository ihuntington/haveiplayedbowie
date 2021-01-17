'use strict';

const routes = require('../routes');

const plugin = {
    name: 'app/tracks',
    register: async (server) => {
        server.route({
            method: 'GET',
            path: '/tracks/{track}',
            handler: routes.track,
        });
    },
};

module.exports = plugin;
