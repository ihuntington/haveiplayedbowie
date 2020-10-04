'use strict';

class UsersRepository{
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
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

    async find(params) {
        return this.db.any()
    }
}

module.exports = UsersRepository;
