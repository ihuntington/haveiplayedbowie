'use strict';

const pgPromise = require('pg-promise');
const { Artists, Scrobbles, Tracks, Users } = require('./repos');

class DatabaseClient {
    constructor() {
        this.pgp = pgPromise({
            extend(obj) {
                obj.artists = new Artists(obj, this.pgp);
                obj.scrobbles = new Scrobbles(obj, this.pgp);
                obj.tracks = new Tracks(obj, this.pgp);
                obj.users = new Users(obj, this.pgp);
            }
        });

        this.db = this.pgp(this.getConfig());
        this.db.connect();
    }

    getConfig() {
        return {
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            database: process.env.SQL_DATABASE,
            port: 5432,
            host: 'localhost',
        };
    }
}

module.exports = DatabaseClient;
