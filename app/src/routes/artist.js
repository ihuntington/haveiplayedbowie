'use strict';

// const formatISO = require('date-fns/formatISO');
// const startOfYear = require('date-fns/startOfYear');
// const endOfYear = require('date-fns/endOfYear');
const charts = require('../services/charts');
const artists = require('../services/artists');

async function artist(request, h) {
    const { aid } = request.params;
    // const { from, to } = request.query;

    const now = new Date();
    // const defaultFrom = startOfYear(now);
    // const defaultTo = endOfYear(now);

    // const query = {
    //     from: formatISO(from || defaultFrom, { representation: 'date' }),
    //     to: formatISO(to || defaultTo, { representation: 'date' }),
    // };

    const [artist, tracks] = await Promise.all([
        artists.getArtistById(aid),
        charts.getTopTracks({ artist: aid, limit: 10, }),
    ]);

    // const spotifyArtist = await request.server.methods.spotify.artist({ id: artists.spotify_id });

    if (!artist) {
        h.response().code(404);
    }

    return h.view('artist', {
        artist,
        year: now.getUTCFullYear(),
        tracks: tracks.items,
        // ...data.payload,
    });
}

module.exports = artist;
