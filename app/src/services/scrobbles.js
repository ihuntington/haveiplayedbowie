'use strict';

const process = require('process');
const Wreck = require('@hapi/wreck');
const qs = require('query-string');

const getTotalByDate = async ({ column, date, distinct = false, period, username, artist }) => {
    const { SERVICE_API_URL } = process.env;
    const query = qs.stringify({
        column,
        date,
        distinct,
        period,
        ...(username && { username }),
        ...(artist && { artist }),
    });

    try {
        const { payload } = await Wreck.get(`${SERVICE_API_URL}/scrobbles/count?${query}`, { json: true });
        return payload;
    } catch (err) {
        return null;
    }
};

const getDurationByPeriod = async ({ date, period, username }) => {
    const { SERVICE_API_URL } = process.env;
    const query = qs.stringify({
        date,
        period,
        ...(username && { username }),
    });

    try {
        const res = await Wreck.get(`${SERVICE_API_URL}/scrobbles/duration?${query}`, { json: true });
        return res.payload;
    } catch (err) {
        return null;
    }
};

const add = async (user, played_at, service, track) => {
    const { SERVICE_API_URL } = process.env;

    try {
        const url = `${SERVICE_API_URL}/scrobbles`;
        const response = await Wreck.post(url, {
            payload: {
                user,
                items: [{ track, played_at, service }],
            },
            json: true,
        });

        return response.payload;
    } catch (err) {
        console.error(err);
        return null;
    }
};

module.exports = {
    add,
    getDurationByPeriod,
    getTotalByDate,
};
