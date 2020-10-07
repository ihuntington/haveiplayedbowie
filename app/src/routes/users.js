'use strict';

const process = require('process');
const Wreck = require('@hapi/wreck');
const Boom = require('@hapi/boom');
const addDays = require('date-fns/addDays');
const formatISO = require('date-fns/formatISO');
const isToday = require('date-fns/isToday');
const { utcToZonedTime } = require('date-fns-tz');

const createDiary = require('./diary');

const SPOTIFY_START_DATE = utcToZonedTime(new Date(process.env.SPOTIFY_START_DATE), 'utc');

function formatDate(date) {
    return formatISO(date, { representation: 'date' });
}

function formatLink(url, date) {
    return `${url.origin}${url.pathname}?date=${date}`;
}

async function diary(request, h) {
    const { SERVICE_API_URL } = process.env;
    const username = request.params.username;
    const queryDate = request.query.date || new Date();
    const date = formatISO(queryDate, { representation: 'date' });
    const previousDate = addDays(queryDate, -1);
    const nextDate = addDays(queryDate, 1);
    const links = {
        previous: formatLink(request.url, formatDate(previousDate)),
        next: isToday(queryDate) ? null : formatLink(request.url, formatDate(nextDate)),
    };

    let timezone = 'utc';

    try {
        const { payload } = await Wreck.get(`${SERVICE_API_URL}/users?username=${username}`, { json: true });

        if (payload.data.length !== 1) {
            return Boom.notFound('/routes/diary - User not found');
        }

        if (queryDate >= SPOTIFY_START_DATE) {
            timezone = payload.data[0].timezone;
        }
    } catch (err) {
        console.error(err);
        return Boom.badImplementation();
    }

    const { payload } = await Wreck.get(`${SERVICE_API_URL}/scrobbles?username=${username}&date=${date}`, {
        json: true,
    });

    let items = [];

    if (payload.items.length > 0) {
        items = createDiary(payload.items, timezone);
    }

    const viewContext = {
        // TODO: hasBowie?
        hasBowie: false,
        user: username,
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
