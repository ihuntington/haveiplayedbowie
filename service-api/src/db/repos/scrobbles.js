'use strict';

const parseISO = require('date-fns/parseISO');
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

const transformTotal = (item) => ({
    ...item,
    total: parseInt(item.total, 10),
});

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

    async total({ artist, track, username, from, to }, context) {
        const ctx = context || this.db;
        const select = 'SELECT count(*) FROM scrobbles $(where:raw)';
        const where = [];
        const startDate = parseISO(process.env.PROJECT_START_DATE);
        const dates = {
            from: from || startDate,
            to: to || new Date(),
        };

        where.push(this.pgp.as.format('WHERE scrobbles.played_at BETWEEN $(from) AND $(to)', dates));

        if (artist) {
            where.push(this.pgp.as.format('AND artists.id = $(artist)', { artist }));
            where.unshift(
                'JOIN artists_tracks ON artists_tracks.track_id = scrobbles.track_id',
                'JOIN artists ON artists.id = artists_tracks.artist_id',
            );
        }

        if (track) {
            where.push(this.pgp.as.format('AND scrobbles.track_id = $(track)', { track }));
        }

        if (username) {
            where.push(this.pgp.as.format('AND users.username = $(username)', { username }));
            where.unshift('JOIN users ON users.id = scrobbles.user_id');
        }

        const record = await ctx.one(select, { where: where.join(' ') }, r => Number(r.count));
        return record;
    }

    async getTopArtists({ from, to, username, limit = 10 }, context) {
        const ctx = context || this.db;
        const where = [];

        // A date range is always defined and defaults to:
        // from - start of the current year
        // to - start of the next year
        where.push(this.pgp.as.format('WHERE scrobbles.played_at BETWEEN $1 AND $2', [from, to]));

        if (username) {
            where.push(this.pgp.as.format('AND users.username = $1', [username]));
            // If username is defined then the users table must be joined
            where.unshift('JOIN users ON users.id = scrobbles.user_id');
        }

        const query = this.pgp.as.format(sql.scrobbles.getTopArtists, { where: where.join(' '), limit });

        const records = await ctx.map(query, [], transformTotal);

        return records;
    }

    async getTopTracks({ artist, from, to, username, limit = 10 }, context) {
        const ctx = context || this.db;

        // TODO: check if context is a task otherwise use that and not a new one
        const records = await ctx.task(async (task) => {
            const where = [];

            where.push(this.pgp.as.format('AND scrobbles.played_at BETWEEN $(from) AND $(to)', { from, to }));

            if (artist) {
                where.push(this.pgp.as.format('AND artists.id = $(artist)', { artist }));
                where.unshift(
                    'JOIN artists_tracks ON artists_tracks.track_id = scrobbles.track_id',
                    'JOIN artists ON artists.id = artists_tracks.artist_id'
                );
            }

            if (username) {
                where.push(this.pgp.as.format('AND users.username = $(username)', { username }));
                where.unshift('JOIN users ON users.id = scrobbles.user_id');
            }

            const tracks = await task.map(sql.scrobbles.getTopTracks, { where: where.join(' '), limit }, transformTotal);
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

    async getCharts({ from, to, username, limit = 10 }) {
        const [artists, tracks, bowieTracks, bowieTotal] = await this.db.task(task => {
            const { BOWIE_ARTIST_ID } = process.env;
            const params = {
                from,
                to,
                limit,
            };

            if (username) {
                params.username = username;
            }

            const paramsWithBowie = {
                ...params,
                artist: BOWIE_ARTIST_ID,
            };

            return task.batch([
                task.scrobbles.getTopArtists(params, task),
                task.scrobbles.getTopTracks(params, task),
                task.scrobbles.getTopTracks(paramsWithBowie, task),
                task.scrobbles.total(paramsWithBowie, task),
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
