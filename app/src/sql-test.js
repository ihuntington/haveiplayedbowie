const path = require('path');
const { QueryFile } = require('pg-promise');

function sql(file) {
    const filePath = path.resolve(__dirname, 'sql', file);
    return new QueryFile(filePath, { minify: true });
}

module.exports = {
    artists: {
        scrobblesByMonth: sql('artists/scrobbles-by-month.sql'),
    },
    users: {
        add: sql('users/add.sql'),
        find: sql('users/find.sql'),
        findByEmail: sql('users/find-by-email.sql'),
    },
    scrobbles: {
        findByUserAndDate: sql('scrobbles/find-by-user-and-date.sql'),
    },
};
