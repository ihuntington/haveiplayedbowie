'use strict';

const db = require('../db');

async function track(request, h) {
    try {
        const result = await db.getTrack(request.params.track);
        return h.view('track', result);
    } catch (err) {
        return h.response().code(404);
    }
}

module.exports = track;
