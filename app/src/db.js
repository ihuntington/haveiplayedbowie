'use strict';

const process = require('process');
const pgp = require('pg-promise')();
const sql = require('./sql');

// TODO: cast to number in query
const transformTotal = (item) => ({
    ...item,
    total: parseInt(item.total, 10),
});

const config = {
    host: 'localhost',
    port: 5432,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE,
};

let client;

const connect = () => {
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
        return client.manyOrNone(sql.artists.scrobblesByMonth, params);
    },
    getArtistSummary: (id, from, to) => {
        return client.task((task) => {
            const params = {
                id,
                from,
                to,
            };

            return task.batch([
                task.one(sql.artists.getById, { id }),
                task.map(sql.artists.scrobblesByMonth, { ...params, year: from.getFullYear() }, transformTotal),
                task.map(sql.scrobbles.getTopTracksByArtist, params, transformTotal),
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
                task.map(sql.scrobbles.getTopArtists, params, transformTotal),
                task.map(sql.scrobbles.getTopTracks, params, transformTotal),
                task.map(sql.scrobbles.getTopTracksByArtist, paramsWithBowie, transformTotal),
                task.map(sql.scrobbles.getTotalTracksByArtist, paramsWithBowie, transformTotal)
            ])
            .then(([artists, tracks, bowieTracks, bowieTotal]) => ({
                artists,
                tracks,
                bowieTracks,
                bowieTotal,
            }));
        });
    },
    getTopTracks: (from, to) => client.manyOrNone(sql.scrobbles.getTopTracks, { from, to }),
    getTrack: (trackId) => client.one(sql.scrobbles.getTrackById, { trackId }),
    checkUsername: (username) => client.oneOrNone(sql.users.checkUsername, { username }),
    getUser: (id) => client.oneOrNone(sql.users.find, { id }),
    getUserByEmail: (email) => client.oneOrNone(sql.users.findByEmail, { email }),
    addUser: (user) => client.one(sql.users.add, { ...user }),
    updateUsername: (uid, username) => client.none(sql.users.updateUsername, { uid, username }),
    getScrobbles: (username, date) => {
        return client.task(task => {
            return task.one('SELECT id AS uid FROM users WHERE username = $1', [username])
                .then(({ uid }) => {
                    return task.any(sql.scrobbles.findByUserAndDate, { uid, date });
                });
        });
    },
};
