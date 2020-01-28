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
const getHours = require('date-fns/getHours');
const getMinutes = require('date-fns/getMinutes');
const differenceInMinutes = require('date-fns/differenceInMinutes');
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

    function getDuration(ms) {
        const minutes = Math.floor((ms / 1000) / 60);
        const seconds = Math.round((ms / 1000) % 60);
        return {
            minutes,
            seconds,
            formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        };
    }

    function getTrackTimings(track) {
        let duration = null;
        let endTime = null;
        let startTime = track.played_at.getTime();
        let status = 'INCOMPLETE';
        let endsInNextHour = false;

        if (track.duration_ms) {
            duration = getDuration(track.duration_ms);
            endTime = startTime + track.duration_ms;
            status = 'COMPLETE';
            endsInNextHour = getHours(startTime) !== getHours(endTime);
        }

        return {
            startTime,
            endTime,
            endsInNextHour,
            duration,
            status,
        };
    }

    function filterByBowie(track) {
        return track.artist_id === process.env.BOWIE_ARTIST_ID;
    }

    function calculatePosY(minutes) {
        const TEN_MINUTES_IN_PX = 20;

        if (minutes === 0) {
            return 0;
        }

        if (minutes < 10) {
            return minutes * 2;
        }

        const tens = (Math.floor(minutes / 10) * TEN_MINUTES_IN_PX);
        const ones = ((minutes % 10) * (TEN_MINUTES_IN_PX / 10));

        return tens + ones;
    }

    server.route({
        method: 'GET',
        path: '/',
        handler: async (request, h) => {
            const formatDate = (date) => formatISO(date, { representation: 'date' });
            const formatQuery = (date) => `${request.path}?date=${formatDate(date)}`;
            const isoDate = parseISO(request.query.date || '2019-12-31');
            const previousDate = addDays(isoDate, -1);
            const nextDate = addDays(isoDate, 1);

            const response = await db.getTracksByDate(isoDate);
            const tracksWithTimes = response.map((track) => ({
                ...track,
                ...getTrackTimings(track),
            }))
            const hasBowie = response.filter(filterByBowie);
            const hours = getHourlyIntervals(isoDate, addDays(isoDate, 1));
            const timeRange = hours.map((time) => ({ time, items: [] }));

            const events = [];
            let count = 0;

            while (count < tracksWithTimes.length) {
                const track = tracksWithTimes[count];
                // TODO: what is there is no duration as spotify could not find it
                // 60000 is temp
                const roundedTrackDuration = Math.round((track.duration_ms / 1000) / 60);
                let skipped = false;
                let trackHeight = roundedTrackDuration || 1;

                if (count + 1 !== tracksWithTimes.length) {
                    const nextTrack = tracksWithTimes[count + 1];

                    if (track.startTime === nextTrack.startTime) {
                        skipped = true;
                    }

                    if (nextTrack.status === 'COMPLETE') {
                        const differenceBetweenTracks = nextTrack.startTime - track.endTime;

                        if (differenceBetweenTracks > 0 && differenceBetweenTracks <= 60000) {
                            trackHeight = differenceInMinutes(nextTrack.startTime, track.startTime);
                        }
                    }
                }

                events.push({
                    ...track,
                    trackHeight,
                    skipped,
                });

                count += 1;
            }

            for (const event of events) {
                const eventDate = event.played_at.getDate();
                const eventHour = event.played_at.getHours();
                const matchedHour = timeRange.findIndex((item) => {
                    return item.time.getDate() === eventDate && item.time.getHours() === eventHour;
                });

                timeRange[matchedHour].items.push({ ...event })
            }

            const tr = timeRange.map(({ time, items }) => {
                let hourHeight = 20 * 6;

                const tracks = items.map((track, index, arr) => {
                    let posY = 0;

                    if (index === 0) {
                        posY = calculatePosY(getMinutes(track.startTime));
                        hourHeight = posY + (track.trackHeight * 20);
                    } else {
                        const previousTrack = arr[index - 1];
                        let offset = 0;

                        if (
                            previousTrack.status === 'COMPLETE'
                            && track.startTime - previousTrack.endTime > 60000
                        ) {
                            const diff = differenceInMinutes(track.startTime, previousTrack.endTime);
                            // offset = calculatePosY(diff);
                            offset = diff * 2;
                        }

                        posY = hourHeight + offset;
                        hourHeight = posY + (track.trackHeight * 20);
                    }

                    if (track.endsInNextHour) {
                        // TODO: 20 === height in pixels
                        hourHeight = hourHeight - (getMinutes(track.endTime) * 20);
                    }

                    return {
                        ...track,
                        posY,
                    }
                });

                return {
                    time,
                    items: tracks,
                    hourHeight,
                };
            });

            return h.view('index', {
                date: isoDate,
                hasBowie,
                items: tr,
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
