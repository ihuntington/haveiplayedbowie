'use strict';

const Path = require('path');
const { QueryFile } = require('pg-promise');

function sql(file) {
    const filePath = Path.resolve(__dirname, 'sql', file);
    return new QueryFile(filePath, { minify: true });
}

module.exports = {
    artists: {
        find: sql('artists/find.sql'),
        insert: sql('artists/insert.sql'),
    },
    artistsTracks: {
        find: sql('artists-tracks/find.sql'),
        insert: sql('artists-tracks/insert.sql'),
    },
    users: {
        readAll: sql('users/read-all.sql'),
        updateTokens: sql('users/update-tokens.sql'),
    },
    scrobbles: {
        find: sql('scrobbles/find.sql'),
        insert: sql('scrobbles/insert.sql'),
    },
    tracks: {
        find: sql('tracks/find.sql'),
        insert: sql('tracks/insert.sql'),
    },
};
