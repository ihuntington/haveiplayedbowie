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

    async total({ artist, track, user }, context) {
        const ctx = context || this.db;
        let query = 'SELECT count(*) FROM scrobbles';

        if (artist) {
            query = this.pgp.as.format(`
                SELECT count(*) AS total FROM scrobbles s
                JOIN artists_tracks artr ON artr.track_id = s.track_id
                JOIN artists a ON a.id = artr.artist_id
                WHERE a.id = $1
            `, [artist]);
        }

        if (track) {
            query = this.pgp.as.format('SELECT count(*) AS total FROM scrobbles WHERE track_id = $1', [track]);
        }

        if (user) {
            query = this.pgp.as.format('SELECT count(*) AS total FROM scrobbles WHERE user_id = $1', [user]);
        }

        const record = await ctx.one(query, [], r => Number(r.total));
        return record;
    }

    async getTopTracks(from, to, context) {
        const ctx = context || this.db;
        const params = { from, to };
        // TODO: check if context is a task otherwise use that and not a new one
        const records = await ctx.task(async (task) => {
            const tracks = await task.map(sql.scrobbles.getTopTracks, params, transformTotal);
            const artists = await task.batch(
                tracks.map(track => task.artists.findByTrack(track.id))
            );
            // TODO: an exercise is to get tracks and artists in one SQL query and
            // then groupby together by track.id
            return tracks.map((track, index) => ({
                ...track,
                artists: artists[index],
            }));
        });

        return records;
    }

    async getCharts(from, to) {
        const [artists, tracks, bowieTracks, bowieTotal] = await this.db.task(task => {
            const { BOWIE_ARTIST_ID } = process.env;
            const params = {
                from,
                to,
            };
            const paramsWithBowie = {
                ...params,
                id: BOWIE_ARTIST_ID,
            };

            const transformTotal = (item) => ({
                ...item,
                total: parseInt(item.total, 10),
            });

            // TODO: MOVE EACH TO THEIR OWN METHOD ON MODEL
            return task.batch([
                task.map(sql.scrobbles.getTopArtists, params, transformTotal),
                // TODO: GET ARTISTS FOR TRACKS
                // task.map(sql.scrobbles.getTopTracks, params, transformTotal),
                task.scrobbles.getTopTracks(from, to, task),
                task.map(sql.scrobbles.getTopTracksByArtist, paramsWithBowie, transformTotal),
                task.map(sql.scrobbles.getTotalTracksByArtist, paramsWithBowie, transformTotal)
            ]);
        });

        return {
            artists,
            tracks,
            bowieTracks,
            bowieTotal,
        };
    }
}

module.exports = ScrobblesRepository;
