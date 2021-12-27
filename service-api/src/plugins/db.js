import { db, pgp } from '../db';

export const dbPlugin = {
    name: 'db',
    register: (server) => {
        server.app.db = db;
        server.app.pgp = pgp;
    },
};
