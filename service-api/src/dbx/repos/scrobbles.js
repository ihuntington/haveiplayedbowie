'use strict';

const { scrobbles: sql } = require('../../sql');

class ScrobblesRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
    }

    async findById(id) {
        return this.db.oneOrNone('SELECT * FROM scrobbles WHERE id = $1', id);
    }

    async find(query) {
        // return this.db.any()
    }
}
