'use strict';

const DatabaseClient = require('../db');

const dbPlugin = {
    name: 'db',
    register: async (server) => {
        const { db, pgp } = new DatabaseClient();
        server.app.db = db;
        server.app.pgp = pgp;
    },
};

module.exports = dbPlugin;
