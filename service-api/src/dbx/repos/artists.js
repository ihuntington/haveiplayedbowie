'use strict';

const sql = require('../../sql');

class ArtistsRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
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
}

module.exports = ArtistsRepository;
