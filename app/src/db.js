'use strict';

const process = require('process');
const pgp = require('pg-promise')();
const sql = require('./sql');
const sqlTest = require('./sql-test');

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

const transformTotal = (item) => ({
    ...item,
    total: parseInt(item.total, 10),
});

module.exports = {
    getArtistById: (id) => client.one(sql.getArtistById, { id }),
    // getArtistScrobblesByDateRange: (artist, from, to) => client.manyOrNone(sql.getArtistScrobblesByDateRange, { artist, from , to }),
    getArtistScrobblesByDateRange: (id, from, to) => {
        const params = {
            id,
            from,
            to,
            year: from.getFullYear(),
        };
        return client.manyOrNone(sqlTest.artists.scrobblesByMonth, params);
    },
    getArtistSummary: (id, from, to) => {
        return client.task((task) => {
            const params = {
                id,
                from,
                to,
            };

            return Promise.all([
                task.one(sql.getArtistById, { id }),
                task.map(sqlTest.artists.scrobblesByMonth, { ...params, year: from.getFullYear() }, transformTotal),
                task.map(sql.getTopTracksByArtist, params, transformTotal),
            ])
            .then(([artist, chart, topTracks]) => ({
                artist,
                chart,
                topTracks,
            }));
        });
    },
    getSummary: (from, to) => {
        return client.task((task) => {
            const { BOWIE_ARTIST_ID } = process.env;
            const params = {
                from,
                to,
            };
            const paramsWithBowie = {
                id: BOWIE_ARTIST_ID,
                ...params,
            };
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
    checkUsername: (username) => client.oneOrNone(sqlTest.users.checkUsername, { username }),
    getUser: (id) => client.oneOrNone(sqlTest.users.find, { id }),
    getUserByEmail: (email) => client.oneOrNone(sqlTest.users.findByEmail, { email }),
    addUser: (user) => client.one(sqlTest.users.add, { ...user }),
    updateUsername: (uid, username) => client.none(sqlTest.users.updateUsername, { uid, username }),
    getScrobbles: (username, date) => {
        return client.task(task => {
            return task.one('SELECT id FROM users WHERE username = $1', [username])
                .then(({ id: uid }) => {
                    return task.manyOrNone(sqlTest.scrobbles.findByUserAndDate, { uid, date })
                });
        }).then(data => data);
    },
};
