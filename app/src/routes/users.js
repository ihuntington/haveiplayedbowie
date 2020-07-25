'use strict';

const process = require('process');
const Wreck = require('@hapi/wreck');
const addDays = require('date-fns/addDays');
const formatISO = require('date-fns/formatISO');
const isToday = require('date-fns/isToday');
const createDiary = require('./diary');

function formatDate(date) {
    return formatISO(date, { representation: 'date' });
}

function formatLink(url, date) {
    return `${url.origin}${url.pathname}?date=${date}`;
}

async function diary(request, h) {
    const { SERVICE_API_URL } = process.env;
    const user = request.params.user;
    const queryDate = request.query.date || new Date();
    const date = formatISO(queryDate, { representation: 'date' });
    const previousDate = addDays(queryDate, -1);
    const nextDate = addDays(queryDate, 1);
    const links = {
        previous: formatLink(request.url, formatDate(previousDate)),
        next: isToday(queryDate) ? null : formatLink(request.url, formatDate(nextDate)),
    };

    /**
     * TODO:
     * - user does not exist: 404
     */

    const { payload } = await Wreck.get(`${SERVICE_API_URL}/scrobbles?username=${user}&date=${date}`, {
        json: true,
    });

    let items = [];

    if (payload.items.length !== 0) {
        items = createDiary(payload.items);
    }

    const viewContext = {
        // TODO: hasBowie?
        hasBowie: false,
        user,
        date: formatDate(queryDate),
        items,
        links,
        auth: {
            isAuthenticated: false,
        }
    }

    // if (request.auth.isAuthenticated) {
    //     viewContext.auth.isAuthenticated = true;
    //     viewContext.auth.username = request.auth.credentials.username;
    // }

    return h.view('diary', viewContext);
}

module.exports = {
    diary,
};
