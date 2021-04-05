'use strict';

const { db, pgp } = require('../db');

const dbPlugin = {
    name: 'db',
    register: (server) => {
        server.app.db = db;
        server.app.pgp = pgp;
    },
};

module.exports = dbPlugin;
