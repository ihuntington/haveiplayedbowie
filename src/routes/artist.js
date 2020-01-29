'use strict';

const db = require('../db');

async function artist(request, h) {
    try {
        // TODO: remove the hard coding when further years added
        const from = new Date(2019, 0, 1);
        const to = new Date(2019, 11, 31);
        const result = await db.getArtistSummary(request.params.artist, from, to);

        return h.view('artist', result);
    } catch (err) {
        console.log(err);
        return h.response().code(404);
    }
}

module.exports = artist;
