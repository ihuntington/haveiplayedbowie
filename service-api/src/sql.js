'use strict';

const Path = require('path');
const { QueryFile } = require('pg-promise');

function sql(file) {
    const filePath = Path.resolve(__dirname, 'sql', file);
    return new QueryFile(filePath, { minify: true });
}

module.exports = {
    artists: {
        findByName: sql('artists/find-by-name.sql'),
        findBySpotify: sql('artists/find-by-spotify.sql'),
        getScrobblesByMonth: sql('artists/scrobbles-by-month.sql'),
        insert: sql('artists/insert.sql'),
    },
    artistsTracks: {
        selectArtistsByTrack: sql('artists-tracks/select-artists-by-track.sql'),
    },
    scrobbles: {
        find: sql('scrobbles/find-existing-scrobble.sql'),
        findByUserAndDate: sql('scrobbles/find-by-user-and-date.sql'),
        getTopArtists: sql('scrobbles/get-top-artists.sql'),
        getTopTracks: sql('scrobbles/get-top-tracks.sql'),
        getTopTracksByArtist: sql('scrobbles/get-top-tracks-by-artist.sql'),
        getTotalTracksByArtist: sql('scrobbles/get-total-tracks-by-artist.sql'),
        insert: sql('scrobbles/insert.sql'),
    },
    tracks: {
        findByName: sql('tracks/find-by-name.sql'),
        findBySpotify: sql('tracks/find-by-spotify.sql'),
        insert: sql('tracks/insert.sql'),
    },
    users: {
        insert: sql('users/insert.sql'),
        getByRecentlyPlayed: sql('users/select-by-recently-played.sql'),
        findByEmail: sql('/users/find-by-email.sql'),
        findByUsername: sql('users/select-by-username.sql'),
        updateTokens: sql('users/update-user-tokens.sql'),
        updateRecentlyPlayed: sql('users/update-recently-played.sql'),
    },
};
