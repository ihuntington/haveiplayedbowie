'use strict';

const process = require('process');
const qs = require('query-string');
const Wreck = require('@hapi/wreck');
const format = require('date-fns/format');

async function charts(request, h) {
    const { SERVICE_API_URL } = process.env;
    const present = new Date();

    let { month, year } = request.params;
    let datestampFormat = 'yyyy';

    if (!year) {
        year = present.getUTCFullYear();
    }

    const query = { year };

    if (month) {
        month = month > 0 ? month - 1 : 0;
        datestampFormat = 'LLLL yyyy';
        query.month = month;
    } else {
        month = 0;
    }

    if (year > present.getUTCFullYear()) {
        return h.response().code(400);
    }

    try {
        const url = `${SERVICE_API_URL}/charts?${qs.stringify(query)}`;
        const { payload } = await Wreck.get(url, { json: true });
        return h.view('chart', {
            ...payload,
            datestamp: format(new Date(year, month), datestampFormat),
        });
    } catch (err) {
        return h.response().code(500);
    }
}

module.exports = charts;
