'use strict';

const sql = require('../../sql');
const { pathToObject } = require('../../utils');

const transform = (row) => {
    return pathToObject(row);
};

const compare = (a, b) => {
    const sortedA = a.slice().sort();
    const sortedB = b.slice().sort();

    return sortedA.length === sortedB.length && sortedA.every((value, index) => {
        return value === sortedB[index];
    });
};

class ScrobblesRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
    }

    async add(uid, item) {
        return this.db.tx('add-scrobble', async (tx) => {
            let track;
            let artists;
            let scrobble;

            const artistNamesToAdd = item.track.artists.map(({ name }) => name);

            // Find all existing tracks by the track name
            const existingTracks = await tx.any(sql.tracks.findByName, [item.track.name]);

            // Find all existing artists for each existing track found
            const existingArtists = await tx.batch(
                existingTracks.map(({ id }) =>
                    tx.any(sql.artistsTracks.selectArtistsByTrack, [id])
                )
            );

            // Zip the existing tracks and existing artists together
            const existingArtistsTracks = existingTracks.map((track, index) => ({
                ...track,
                artists: existingArtists[index]
            }));

            const match = existingArtistsTracks.find(({ artists }) => {
                return compare(artistNamesToAdd, artists.map(({ name }) => name));
            });

            if (match) {
                scrobble = await this.findOrCreate({
                    track_id: match.id,
                    played_at: item.played_at,
                    user_id: uid,
                }, tx);

                return scrobble;
            }

            track = await this.db.tracks.add({
                name: item.track.name,
                duration_ms: item.track.duration_ms,
                spotify_id: item.track.id,
            }, tx);

            artists = await tx.batch(
                item.track.artists.map(({ name, id: spotify_id }) =>
                    this.db.artists.findOrCreate({ name, spotify_id }, tx)
                )
            );

            const artistsTracksToAdd = this.pgp.helpers.insert(
                artists.map((artist, index) => ({
                    artist_id: artist.id,
                    track_id: track.id,
                    artist_order: index,
                })),
                ['artist_id', 'track_id', 'artist_order'],
                'artists_tracks'
            );

            await tx.any(artistsTracksToAdd);

            scrobble = await this.findOrCreate({
                track_id: track.id,
                played_at: item.played_at,
                user_id: uid,
            }, tx);

            return scrobble;
        });
    }

    async findById(id) {
        return this.db.oneOrNone('SELECT * FROM scrobbles WHERE id = $1', id);
    }

    async find({ date, uid }) {
        return this.db.task(async (task) => {
            let where = [];

            if (uid) {
                where.push(this.pgp.as.format('scrobbles.user_id = $1', [uid]));
            }

            // if (tid) {
            //     where.push(this.pgp.as.format('scrobbles.track_id = $1', [tid]));
            // }

            if (date) {
                where.push(this.pgp.as.format('CAST(scrobbles.played_at AS DATE) = $1', [date]));
            }

            where = 'WHERE ' + where.join(' AND ');

            const scrobbles = await task.map(sql.scrobbles.findByUserAndDate, [where], transform);

            const artists = await task.batch(
                scrobbles.map(({ track }) =>
                    task.artists.findByTrack(track.id)
                )
            );

            return scrobbles.map((scrobble, index) => ({
                ...scrobble,
                track: {
                    ...scrobble.track,
                    artists: artists[index],
                },
            }));
        });
    }

    async findOrCreate(item, context) {
        const ctx = context || this.db;
        const record = await ctx.oneOrNone(sql.scrobbles.find, item);
        return record || await ctx.one(sql.scrobbles.insert, item);
    }
}

module.exports = ScrobblesRepository;
