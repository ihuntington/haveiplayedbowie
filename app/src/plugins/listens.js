'use strict';

const services = require('../services');
const Spotify = require('../library/spotify');

const plugin = {
    name: 'app/listens',
    dependencies: ['@hapi/cookie'],
    register: async (server) => {
    },
};

module.exports = plugin;
