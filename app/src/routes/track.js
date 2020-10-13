'use strict';

const process = require('process');
const Wreck = require('@hapi/wreck');

async function track(request, h) {
    const { SERVICE_API_URL } = process.env;

    try {
        const data = await Wreck.get(`${SERVICE_API_URL}/tracks/${request.params.track}`, { json: true });
        return h.view('track', data.payload);
    } catch (err) {
        console.error(err);
        return h.response().code(404);
    }
}

module.exports = track;
