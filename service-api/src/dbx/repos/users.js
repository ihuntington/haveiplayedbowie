'use strict';

const { users: sql } = require('../../sql');

class UsersRepository{
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
    }

    async add(user) {
        return this.db.one('INSERT INTO users(${this:name}) VALUES(${this:csv}) RETURNING *', user);
    }

    async findById(id) {
        return this.db.oneOrNone('SELECT * FROM users WHERE id = $1', id);
    }

    async findByEmail(email) {
        return this.db.oneOrNone('SELECT * FROM users WHERE email = $1', email);
    }

    async findByUsername(username) {
        return this.db.oneOrNone('SELECT * FROM users WHERE username = $1', username);
    }

    async find(query) {
        const params = Object.entries(query);

        if (!params.length) {
            return this.db.any('SELECT * FROM users');
        }

        return this.db.any('SELECT * FROM users WHERE $1:name = $2', ...params);
    }

    async findByRecentlyPlayed() {
        return this.db.any(sql.getByRecentlyPlayed);
    }

    async update(id, params) {
        const where = this.pgp.as.format(' WHERE id = $1', id);
        const query = this.pgp.helpers.update(params, null, 'users');
        return this.db.none(query + where);
    }
}

module.exports = UsersRepository;
