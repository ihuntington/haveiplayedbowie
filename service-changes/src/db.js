'use strict';

const process = require('process');
const pgp = require('pg-promise');
const sql = require('./sql');

function configure() {
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

    return config;
}

const pgpInitOptions = {
    query(e) {
        if (process.env.NODE_ENV === 'development') {
            console.log('Query', e.query);
        }
    },
    transact(e) {
        if (process.env.NODE_ENV === 'development') {
            if (e.ctx.finish) {
                console.log('Transaction duration', e.ctx.duration);
                if (e.ctx.success) {
                    console.log('Transaction success');
                } else {
                    console.log('Transaction failure');
                }
            } else {
                console.log('Transaction start time', e.ctx.start);
            }
        }
    }
}

const client = pgp(pgpInitOptions)(configure());

client.connect();

async function getInsertArtist(context, artistName) {
    const record = await context.oneOrNone(sql.artists.find, { artistName });
    return record || await context.one(sql.artists.insert, { artistName });
}

async function getInsertTrack(context, track, artist) {
    const findParams = {
        trackName: track.name,
        artistName: artist.artist_name,
    };
    const insertParams = {
        trackName: track.name,
        spotify_id: track.spotify_id,
        duration_ms: track.duration_ms,
    };
    const record = await context.oneOrNone(sql.tracks.find, findParams);
    return record || await context.one(sql.tracks.insert, insertParams);
}

async function getInsertArtistTrack(context, artist, track) {
    const params = { aid: artist.artist_id, tid: track.track_id };
    const record = await context.oneOrNone(sql.artistsTracks.find, params);
    return record || await context.one(sql.artistsTracks.insert, params);
}

async function getInsertScrobble(context, scrobble) {
    const record = await context.oneOrNone(sql.scrobbles.find, scrobble);
    return record || await context.one(sql.scrobbles.insert, scrobble);
}

async function updateRecentlyPlayed(context, user_id) {
    const now = new Date(Date.now());
    return await context.none(sql.users.updateRecentlyPlayed, { user_id, now });
}

async function getUsersByRecentlyPlayed() {
    const frequency = process.env.RECENTLY_PLAYED_FREQUENCY;
    return await client.any(sql.users.readByRecentlyPlayed, { frequency });
}

module.exports = {
    getUsers: () => client.manyOrNone(sql.users.readAll),
    getUsersByRecentlyPlayed,
    importTrack: (uid, item) => {
        return client.tx('import-recently-played', async (tx) => {
            // const artists = await tx.batch(item.artists.map((artist, index) => getInsertArtist(tx, artist.name, index)));
            const artist = await getInsertArtist(tx, item.artists[0].name);
            const track = await getInsertTrack(tx, { name: item.name, spotify_id: item.id, duration_ms: item.duration_ms }, artist);
            const artistTrack = await getInsertArtistTrack(tx, artist, track);
            const scrobble = await getInsertScrobble(tx, { track_id: track.track_id, played_at: item.played_at, user_id: uid });

            await updateRecentlyPlayed(tx, uid);

            return {
                artist,
                track,
                artistTrack,
                scrobble,
            }
        })
        .then((data) => data)
    },
    updateUserTokens: (id, token, refreshToken) => client.none(sql.users.updateTokens, { id, token, refreshToken }),
};
