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
const db = require('./db');

function getHourlyIntervals(dateLeft, dateRight) {
    const MILLISECONDS_IN_HOUR = 3600000;

    if (dateLeft > dateRight) {
        throw new Error('Date 1 must be a time before Date 2');
    }

    const start = new Date(dateLeft).setMinutes(0);
    const end = new Date(dateRight).setMinutes(0); // + MILLISECONDS_IN_HOUR;
    const dates = [];
    let curr = new Date(start).getTime();

    while (curr <= end) {
        dates.push(new Date(curr));
        curr += MILLISECONDS_IN_HOUR;
    }

    return dates;
}

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

            const hours = getHourlyIntervals(parsedDate, nextDate);
            const timeRange = hours.map((time) => ({ time, items: [] }));

            let tracksWithPlayEnd = result.map((track, index, arr) => {
                const start = track.played_at.valueOf();

                let end;
                let nextTrack;
                let skipped = false;

                if ((index + 1) !== arr.length) {
                    nextTrack = arr[index + 1];

                    if (start === nextTrack.played_at.valueOf()) {
                        skipped = true;
                        end = track.played_at;
                    } else {
                        let endMinutes = new Date(start + track.duration_ms).getMinutes();
                        let nextStartMinutes = nextTrack.played_at.getMinutes();

                        end = new Date(start + track.duration_ms);

                        if (endMinutes === nextStartMinutes) {
                            end.setSeconds(0);
                        }
                    }
                } else {
                    end = new Date(start + track.duration_ms);
                }

                return {
                    ...track,
                    played_end: end,
                    skipped,
                    minutes: Math.floor((end - start) / (60 * 1000)) || 1,
                };
            });

            for (const event of tracksWithPlayEnd) {
                const d = event.played_at.getDate()
                const h = event.played_at.getHours()
                const matchedHour = timeRange.findIndex((item) => {
                    return item.time.getDate() === d && item.time.getHours() === h;
                });
                timeRange[matchedHour].items.push({ ...event })
            }

            return h.view('index', {
                date: parsedDate,
                hasBowie,
                items: timeRange,
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
                // TODO: remove the hard coding when further years added
                const from = new Date(2019, 0, 1);
                const to = new Date(2019, 11, 31);
                const result = await db.getArtistSummary(request.params.artist, from, to);
                return h.view('artist', result);
            } catch (err) {
                console.log(err);
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
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
}

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

start();
