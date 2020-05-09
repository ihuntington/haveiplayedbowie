'use strict';

const process = require('process');
const pgp = require('pg-promise')();
const sqlTest = require('./sql-test');

// TODO: cast to number in query
const transformTotal = (item) => ({
    ...item,
    total: parseInt(item.total, 10),
});

const config = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE,
};

let client;

const connect = () => {
    if (
        process.env.INSTANCE_CONNECTION_NAME &&
        process.env.NODE_ENV === 'production'
    ) {
        config.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    } else {
        config.host = 'localhost';
        config.port = 5432;
    }

    if (client) {
        return client;
    }

    client = pgp(config);

    client.connect();

    return client;
};

module.exports = {
    connect,
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

            return task.batch([
                task.one(sqlTest.artists.getById, { id }),
                task.map(sqlTest.artists.scrobblesByMonth, { ...params, year: from.getFullYear() }, transformTotal),
                task.map(sqlTest.scrobbles.getTopTracksByArtist, params, transformTotal),
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
                ...params,
                id: BOWIE_ARTIST_ID,
            };
            return task.batch([
                task.map(sqlTest.scrobbles.getTopArtists, params, transformTotal),
                task.map(sqlTest.scrobbles.getTopTracks, params, transformTotal),
                task.map(sqlTest.scrobbles.getTopTracksByArtist, paramsWithBowie, transformTotal),
                task.map(sqlTest.scrobbles.getTotalTracksByArtist, paramsWithBowie, transformTotal)
            ])
            .then(([artists, tracks, bowieTracks, bowieTotal]) => ({
                artists,
                tracks,
                bowieTracks,
                bowieTotal,
            }));
        });
    },
    getTopTracks: (from, to) => client.manyOrNone(sqlTest.scrobbles.getTopTracks, { from, to }),
    getTrack: (trackId) => client.one(sqlTest.scrobbles.getTrackById, { trackId }),
    checkUsername: (username) => client.oneOrNone(sqlTest.users.checkUsername, { username }),
    getUser: (id) => client.oneOrNone(sqlTest.users.find, { id }),
    getUserByEmail: (email) => client.oneOrNone(sqlTest.users.findByEmail, { email }),
    addUser: (user) => client.one(sqlTest.users.add, { ...user }),
    updateUsername: (uid, username) => client.none(sqlTest.users.updateUsername, { uid, username }),
    getScrobbles: (username, date) => {
        return client.task(task => {
            return task.one('SELECT id AS uid FROM users WHERE username = $1', [username])
                .then(({ uid }) => {
                    return task.any(sqlTest.scrobbles.findByUserAndDate, { uid, date });
                });
        });
    },
};
