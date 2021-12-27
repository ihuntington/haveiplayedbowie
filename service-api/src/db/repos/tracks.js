import sql from '../../sql';

export class TracksRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
    }

    async add(track, context) {
        const ctx = context || this.db;
        return ctx.one(sql.tracks.insert, track);
    }

    async findByName(name, context) {
        const ctx = context || this.db;
        return ctx.any(sql.tracks.findByName, [name]);
    }

    async findById(id, context) {
        const ctx = context || this.db;
        return ctx.one('SELECT * FROM tracks WHERE tracks.id = $1', [id]);
    }

    async get(id) {
        const data = await this.db.task(async (task) => {
            const [track, artists, total] = await task.batch([
                this.findById(id, task),
                this.db.artists.findByTrack(id, task),
                this.db.scrobbles.total({ track: id }, task),
            ]);

            return {
                ...track,
                artists,
                total,
            };
        });

        return data;
    }
}
