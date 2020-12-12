'use strict';

const process = require('process');
const Wreck = require('@hapi/wreck');
const qs = require('query-string');

const getTopTracks = async ({ date, period, limit = 5, artist, username, month, year }) => {
    const { SERVICE_API_URL } = process.env;
    const query = qs.stringify({
        limit,
        ...(artist && { artist }),
        ...(date && { date }),
        ...(month && { month }),
        ...(year && { year }),
        ...(period && { period }),
        ...(username && { username }),
    });

    try {
        const { payload } = await Wreck.get(`${SERVICE_API_URL}/charts/tracks?${query}`, { json: true });
        return payload;
    } catch (err) {
        return null;
    }
};

const getTopArtists = async ({ date, period, limit = 5, username, month, year }) => {
    const { SERVICE_API_URL } = process.env;
    const query = qs.stringify({
        limit,
        ...(date && { date }),
        ...(month && { month }),
        ...(year && { year }),
        ...(period && { period }),
        ...(username && { username }),
    });

    try {
        const { payload } = await Wreck.get(`${SERVICE_API_URL}/charts/artists?${query}`, { json: true });
        return payload;
    } catch (err) {
        return null;
    }
};

module.exports = {
    getTopArtists,
    getTopTracks,
};
