'use strict';

const pgp = require('pg-promise');
const { equals, zip } = require('rambda');
const sql = require('./sql');

let client;

const configure = () => {
    const config = {
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DATABASE,
        port: 5432,
        host: 'localhost',
    };

    return config;
}

exports.connect = () => {
    if (client) {
        return client;
    }

    client = pgp()(configure());

    client.connect();

    return client;
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

const getInsertArtist = async (context, artist) => {
    const record = await context.oneOrNone(sql.artists.findByName, artist);
    return record || await context.one(sql.artists.insert, artist);
};

async function getInsertScrobble(context, scrobble) {
    const record = await context.oneOrNone(sql.scrobbles.find, scrobble);
    return record || await context.one(sql.scrobbles.insert, scrobble);
}

exports.insertScrobbleFromSpotify = (uid, item) => {
    return client.tx('insert-scrobble-from-spotify', async (tx) => {
        let track;
        let artists;
        let artistsTracks;
        let scrobble;

        const requestArtistNames = item.track.artists.map(({ name }) => name);

        // Find all tracks with the track name
        const storedTracks = await tx.any(sql.tracks.findByName, { name: item.track.name });

        // Find all artists for each track found
        const storedArtists = await tx.batch(storedTracks.map((track) =>
            tx.any(sql.artistsTracks.selectArtistsByTrack, { track_id: track.id })
        ));

        const storedArtistsTracks = zip(storedArtists, storedTracks)
            .map(([artists, track]) => ({ ...track, artists }));

        const match = storedArtistsTracks.find(({ artists }) => {
            const names = artists.map(({ artist_name }) => artist_name);
            return equals(requestArtistNames, names);
        });

        if (match) {
            scrobble = await getInsertScrobble(tx, {
                track_id: match.id,
                played_at: item.played_at,
                user_id: uid,
            });
        } else {
            track = await tx.one(sql.tracks.insert, {
                name: item.track.name,
                duration_ms: item.track.duration_ms,
                spotify_id: item.track.id,
            });

            artists = await tx.batch(
                item.track.artists.map(({ name, id: spotify_id }) =>
                    getInsertArtist(tx, { name, spotify_id })
                )
            );

            const insert = pgp().helpers.insert(
                artists.map(({ id: artist_id }, index) => ({ artist_id, track_id: track.id, artist_order: index })),
                ['artist_id', 'track_id', 'artist_order'],
                'artists_tracks'
            );

            artistsTracks = await tx.any(insert);

            scrobble = await getInsertScrobble(tx, {
                track_id: track.id,
                played_at: item.played_at,
                user_id: uid,
            });
        }

        return scrobble;
    });
};
