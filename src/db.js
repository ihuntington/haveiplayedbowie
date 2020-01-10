'use strict';

const process = require('process');
const pgp = require('pg-promise')();
const sql = require('./sql');

const config = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE,
  };

if (
    process.env.INSTANCE_CONNECTION_NAME &&
    process.env.NODE_ENV === 'production'
) {
    config.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
} else {
    config.host = 'localhost';
    config.port = 5432;
}

const client = pgp(config);

client.connect();

module.exports = {
    getArtistById: (id) => client.one(sql.getArtistById, [id]),
    getTrack: (track) => client.one(sql.getTrack, [track]),
    getTracksByDate: (date) => client.query(sql.getTracksByDate, [date]),
};
