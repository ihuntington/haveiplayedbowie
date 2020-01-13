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
    getSummary: (from, to) => {
        return client.task((task) => {
            const { BOWIE_ARTIST_ID } = process.env;
            const params = {
                from,
                to,
            };
            const paramsWithBowie = {
                artist: BOWIE_ARTIST_ID,
                ...params,
            };
            const transformTotal = (item) => ({
                ...item,
                total: parseInt(item.total, 10),
            });
            return Promise.all([
                task.map(sql.getTopArtists, params, transformTotal),
                task.map(sql.getTopTracks, params, transformTotal),
                task.map(sql.getTopTracksByArtist, paramsWithBowie, transformTotal),
                task.map(sql.getTotalTracksByArtist, paramsWithBowie, transformTotal)
            ])
            .then(([artists, tracks, bowieTracks, bowieTotal]) => {
                return {
                    artists,
                    tracks,
                    bowieTracks,
                    bowieTotal,
                };
            });
        });
    },
    getTopTracks: (from, to) => client.manyOrNone(sql.getTopTracks, { from, to }),
    getTrack: (track) => client.one(sql.getTrack, [track]),
    getTracksByDate: (date) => client.query(sql.getTracksByDate, [date]),
};
