'use strict';

const pgPromise = require('pg-promise');
const { Scrobbles, Users } = require('./repos');

const getConfig = () => {
    const config = {
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DATABASE,
        port: 5432,
        host: 'localhost',
    };

    return config;
};

const initOptions = {
    // Extend the database protocol with own custom repositories
    // See http://vitaly-t.github.io/pg-promise/global.html#event:extend
    extend(obj) {
        obj.users = new Users(obj, pgp);
        obj.scrobbles = new Scrobbles(obj, pgp);
    }
};

const pgp = pgPromise(initOptions);
const db = pgp(getConfig());

db.connect();

module.exports = {
    db,
    pgp,
};
