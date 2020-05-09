const path = require('path');
const { QueryFile } = require('pg-promise');

function sql(file) {
    const filePath = path.resolve(__dirname, 'sql', file);
    return new QueryFile(filePath, { minify: true });
}

module.exports = {
    artists: {
        getArtistsBetweenDates: sql('artists/get-artists-between-dates.sql'),
        getById: sql('artists/get-by-id.sql'),
        scrobblesByMonth: sql('artists/scrobbles-by-month.sql'),
        scrobblesBetweenDates: sql('artists/scrobbles-between-dates.sql'),
    },
    users: {
        add: sql('users/add.sql'),
        find: sql('users/find.sql'),
        findByEmail: sql('users/find-by-email.sql'),
        checkUsername: sql('users/check-username.sql'),
        updateUsername: sql('users/update-username.sql'),
    },
    scrobbles: {
        findByUserAndDate: sql('scrobbles/find-by-user-and-date.sql'),
        getTopArtists: sql('scrobbles/get-top-artists.sql'),
        getTopTracks: sql('scrobbles/get-top-tracks.sql'),
        getTopTracksByArtist: sql('scrobbles/get-top-tracks-by-artist.sql'),
        getTotalTracksByArtist: sql('scrobbles/get-total-tracks-by-artist.sql'),
        getTrackById: sql('scrobbles/get-track-by-id.sql'),
    },
};
