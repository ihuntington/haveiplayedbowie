import sql from '../../sql';

// TODO: cast to number in query
const transformTotal = (item) => ({
    ...item,
    total: parseInt(item.total, 10),
});

export class ArtistsRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
    }

    async findById(id, context) {
        const ctx = context || this.db;
        return ctx.one('SELECT id, name, spotify_id FROM artists WHERE id = $1', [id]);
    }

    async findByTrack(id, context) {
        const ctx = context || this.db;
        return ctx.any(sql.artistsTracks.selectArtistsByTrack, [id]);
    }

    async findOrCreate(artist, context) {
        const ctx = context || this.db;
        const record = await ctx.oneOrNone(sql.artists.findByName, artist);
        return record || await ctx.one(sql.artists.insert, artist);
    }

    async getSummary(id, from, to) {
        const params = {
            id,
            from,
            to
        };

        const summary = await this.db.task(async (task) => {
            const [artist, chart, topTracks] = await task.batch([
                this.findById(id, task),
                task.map(sql.artists.getScrobblesByMonth, { ...params, year: from.getFullYear() }, transformTotal),
                // task.scrobbles.getTopTracks({ artist: id, from, to }, task),
            ]);

            return {
                artist,
                chart,
                // topTracks,
            };
        });

        return summary;
    }
}
