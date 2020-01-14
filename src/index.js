'use strict';

const process = require('process');

if (process.env.NODE_ENV === 'production') {
  require('@google-cloud/debug-agent').start();
}

const Hapi = require('@hapi/hapi');
const addDays = require('date-fns/addDays');
const format = require('date-fns/format');
const formatISO = require('date-fns/formatISO');
const parseISO = require('date-fns/parseISO');
const lastDayOfMonth = require('date-fns/lastDayOfMonth');
const db = require('./db');

async function start() {
    const server = Hapi.server({
        port: process.env.PORT || 3000,
        host: '0.0.0.0',
    });

    await server.register(require('@hapi/vision'));

    server.views({
        engines: {
            hbs: {
                module: require('handlebars'),
                isCached: false,
            },
        },
        relativeTo: __dirname,
        path: './templates',
        layout: true,
        layoutPath: './templates/layouts',
        helpersPath: './helpers'
    });

    server.route({
        method: 'GET',
        path: '/check',
        handler: () => {
            return `ok`;
        },
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: async (request, h) => {
            const formatDate = (date) => formatISO(date, { representation: 'date' });
            const formatQuery = (date) => `${request.path}?date=${formatDate(date)}`;

            const parsedDate = parseISO(request.query.date || '2019-12-31');
            const result = await db.getTracksByDate(parsedDate);
            const hasBowie = result.filter((item) => item.artist_id == process.env.BOWIE_ARTIST_ID);
            const previousDate = addDays(parsedDate, -1);
            const nextDate = addDays(parsedDate, 1);

            return h.view('index', {
                date: parsedDate,
                hasBowie,
                items: result,
                previous: previousDate.getFullYear() === 2019 ? formatQuery(previousDate) : null,
                next: nextDate.getFullYear() === 2019 ? formatQuery(nextDate) : null,
            });
        },
    });

    server.route({
        method: 'GET',
        path: '/tracks/{track}',
        handler: async (request, h) => {
            try {
                const result = await db.getTrack(request.params.track);
                return h.view('track', result);
            } catch (err) {
                return h.response().code(404);
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/artists/{artist}',
        handler: async (request, h) => {
            try {
                const result = await db.getArtistById(request.params.artist);
                return h.view('artist', result);
            } catch (err) {
                return h.response().code(404);
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/charts/{year}/{month?}',
        handler: async (request, h) => {
            const present = new Date();
            const year = request.params.year || present.getUTCFullYear();
            let from = new Date(year, 0, 1);
            let to = new Date(year, 11, 31);
            let datestampFormat = 'yyyy';

            if (request.params.month) {
                const month = request.params.month > 0 ? request.params.month - 1 : 0;
                from.setMonth(month, 1);
                to = lastDayOfMonth(new Date(year, month, 1));
                datestampFormat = 'LLLL yyyy';
            }

            if (from.getFullYear() > present.getFullYear()) {
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
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
}

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

start();
