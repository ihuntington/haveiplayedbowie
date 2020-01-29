'use strict';

const format = require('date-fns/format');
const db = require('../db');

async function charts(request, h) {
    const present = new Date();
    const year = request.params.year || present.getUTCFullYear();

    let from = new Date(year, 0);
    let to = new Date(from.getUTCFullYear() + 1, 0);
    let datestampFormat = 'yyyy';

    if (request.params.month) {
        const month = request.params.month > 0 ? request.params.month - 1 : 0;
        from.setMonth(month);
        to = new Date(year, from.getMonth() + 1);
        datestampFormat = 'LLLL yyyy';
    }

    if (from.getUTCFullYear() > present.getUTCFullYear()) {
        return h.response().code(400);
    }

    let datestamp = format(from, datestampFormat);

    try {
        const result = await db.getSummary(from, to);
        return h.view('chart', {
            ...result,
            datestamp,
        });
    } catch (err) {
        return h.response().code(500);
    }
}

module.exports = charts;
