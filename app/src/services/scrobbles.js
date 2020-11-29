'use strict';

const process = require('process');
const Wreck = require('@hapi/wreck');
const qs = require('query-string');

const getTotalByDate = async ({ column, date, distinct = false, period, username }) => {
    const { SERVICE_API_URL } = process.env;
    const query = qs.stringify({
        column,
        date,
        distinct,
        truncate: period,
        ...(username && { username }),
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

module.exports = {
    getDurationByPeriod,
    getTotalByDate,
};
