'use strict';

const sql = require('../../sql');
const { pathToObject } = require('../../utils');

const transform = (row) => {
    return pathToObject(row);
};

class ScrobblesRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
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

            if (date) {
                where.push(this.pgp.as.format('CAST(scrobbles.played_at AS DATE) = $1', [date]));
            }

            where = 'WHERE ' + where.join(' AND ');

            const scrobbles = await task.map(sql.scrobbles.findByUserAndDate, [where], transform);

            const artists = await task.batch(
                scrobbles.map(({ track }) =>
                    task.any(sql.artistsTracks.selectArtistsByTrack, [track.id])
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
}

module.exports = ScrobblesRepository;
