'use strict';

const addDays = require('date-fns/addDays');
const formatISO = require('date-fns/formatISO');
const isToday = require('date-fns/isToday');
const { errors } = require('pg-promise');
const db = require('../db');
const createDiary = require('./diary');

function formatDate(date) {
    return formatISO(date, { representation: 'date' });
}

function formatLink(url, date) {
    return `${url.origin}${url.pathname}?date=${date}`;
}

async function diary(request, h) {
    const user = request.params.user;
    const queryDate = request.query.date || new Date();
    const previousDate = addDays(queryDate, -1);
    const nextDate = addDays(queryDate, 1);
    const links = {
        previous: formatLink(request.url, formatDate(previousDate)),
        next: isToday(queryDate) ? null : formatLink(request.url, formatDate(nextDate)),
    };

    let items = [];

    try {
        const scrobbles = await db.getScrobbles(user, queryDate)
        if (scrobbles.length !== 0) {
            items = createDiary(scrobbles);
        }
    } catch (err) {
        // Internally within getScrobbles no user was found and an error was thrown
        // Really the below should happen within getScrobbles and then app specific
        // error could be thrown which means no user found.
        //
        // db find a user with a username of X and return id
        // db find all scrobbles of user id
        if (err instanceof errors.QueryResultError) {
            if (err.result.rowCount === 0) {
                // TODO: render a view which denotes that no user was found
                return h.response().code(404);
            }
        }
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

    if (request.auth.isAuthenticated) {
        viewContext.auth.isAuthenticated = true;
        viewContext.auth.username = request.auth.credentials.username;
    }

    return h.view('diary', viewContext);
}

module.exports = {
    diary,
};
