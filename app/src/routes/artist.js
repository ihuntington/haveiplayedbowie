'use strict';

const process = require('process');
const Wreck = require('@hapi/wreck');
const qs = require('query-string');
const formatISO = require('date-fns/formatISO');
const startOfYear = require('date-fns/startOfYear');
const endOfYear = require('date-fns/endOfYear');

async function artist(request, h) {
    const { SERVICE_API_URL } = process.env;
    const { from, to } = request.query;

    const now = new Date();
    const defaultFrom = startOfYear(now);
    const defaultTo = endOfYear(now);

    const query = {
        from: formatISO(from || defaultFrom, { representation: 'date' }),
        to: formatISO(to || defaultTo, { representation: 'date' }),
    };

    try {
        const data = await Wreck.get(`${SERVICE_API_URL}/artists/${request.params.artist}/summary?${qs.stringify(query)}`, { json: true });

        return h.view('artist', data.payload);
    } catch (err) {
        console.log(err);
        return h.response().code(404);
    }
}

module.exports = artist;
