'use strict';

const sql = require('../../sql');

class TracksRepository {
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
}

module.exports = TracksRepository;
