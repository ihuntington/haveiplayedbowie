import pgPromise from 'pg-promise';
import { ArtistsRepository, ScrobblesRepository, TracksRepository ,UsersRepository } from './repos';

const getConfig = () => {
    const config = {
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DATABASE,
        port: 5432,
        host: 'localhost',
    };

    return config;
};

const initOptions = {
    // Extend the database protocol with own custom repositories
    // See http://vitaly-t.github.io/pg-promise/global.html#event:extend
    extend(obj) {
        obj.artists = new ArtistsRepository(obj, pgp);
        obj.scrobbles = new ScrobblesRepository(obj, pgp);
        obj.tracks = new TracksRepository(obj, pgp);
        obj.users = new UsersRepository(obj, pgp);
    }
};

export const pgp = pgPromise(initOptions);
export const db = pgp(getConfig());

db.connect();
