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
};
