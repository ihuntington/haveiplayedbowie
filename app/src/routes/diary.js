'use strict';

const process = require('process');
const addDays = require('date-fns/addDays');
const addHours = require('date-fns/addHours');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const formatISO = require('date-fns/formatISO');
const getHours = require('date-fns/getHours');
const getMinutes = require('date-fns/getMinutes');
const parseISO = require('date-fns/parseISO');
const { last } = require('ramda');

const db = require('../db');

function getHourlyIntervals(dateLeft, dateRight) {
    const MILLISECONDS_IN_HOUR = 3600000;

    if (dateLeft > dateRight) {
        throw new Error('Date 1 must be a time before Date 2');
    }

    const start = new Date(dateLeft).setMinutes(0, 0);
    const end = new Date(dateRight).setMinutes(0, 0) + MILLISECONDS_IN_HOUR;
    const range = [];
    let current = start;

    while (current <= end) {
        range.push(new Date(current));
        current += MILLISECONDS_IN_HOUR;
    }

    return range;
}

function getDuration(ms) {
    const minutes = Math.floor((ms / 1000) / 60);
    const seconds = Math.round((ms / 1000) % 60);
    return {
        ms,
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
    } else {
        // TODO: if data is missing then for the sake of UI set the duration
        // as 3 minutes. The UI can denote that data is missing.
        duration = getDuration(3 * 60000);
        endTime = startTime + 3 * 60000;
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

// TODO: rename this function
function calculatePosY(minutes) {
    const TEN_MINUTES_IN_PX = 24;

    if (minutes === 0) {
        return 0;
    }

    if (minutes < 10) {
        return minutes * (TEN_MINUTES_IN_PX / 10);
    }

    const tens = (Math.floor(minutes / 10) * TEN_MINUTES_IN_PX);
    const ones = ((minutes % 10) * (TEN_MINUTES_IN_PX / 10));

    return tens + ones;
}

async function tracks(request, h) {
    const formatDate = (date) => formatISO(date, { representation: 'date' });
    const formatQuery = (date) => `${request.path}?date=${formatDate(date)}`;
    const isoDate = parseISO(request.query.date || '2019-12-31');
    const previousDate = addDays(isoDate, -1);
    const nextDate = addDays(isoDate, 1);

    const response = await db.getTracksByDate(isoDate);

    if (response.length === 0) {
        return h.view('diary', {
            date: isoDate,
            hasBowie: false,
            items: [],
            // TODO: remove fixed year and take the current
            previous: previousDate.getFullYear() === 2019 ? formatQuery(previousDate) : null,
            next: nextDate.getFullYear() === 2019 ? formatQuery(nextDate) : null,
        });
    }

    const tracksWithTimes = response.map((track) => ({
        ...track,
        ...getTrackTimings(track),
    }))
    const hasBowie = response.filter(filterByBowie);
    // const hours = getHourlyIntervals(isoDate, addDays(isoDate, 1));
    const hours = getHourlyIntervals(response[0].played_at, last(response).played_at);
    const timeRange = hours.map((time) => ({ time, items: [] }));

    const events = [];
    let count = 0;

    while (count < tracksWithTimes.length) {
        const track = tracksWithTimes[count];
        const roundedTrackDuration = Math.round((track.duration.ms / 1000) / 60);
        let skipped = false;
        // TODO: if trackHeight cannot be less than 3 -- use 3 * 20 as minimum for ui
        let trackHeight = Math.max(3, roundedTrackDuration);

        if (count + 1 !== tracksWithTimes.length) {
            const nextTrack = tracksWithTimes[count + 1];

            if (track.startTime === nextTrack.startTime) {
                skipped = true;
            }

            // TODO: No longer need the status check as a track is presumed
            // to be at least 3 minutes long by this point. See above.
            if (nextTrack.status === 'COMPLETE') {
                const differenceBetweenTracks = nextTrack.startTime - track.endTime;

                if (differenceBetweenTracks > 0 && differenceBetweenTracks <= 60000) {
                    trackHeight = Math.max(3, differenceInMinutes(nextTrack.startTime, track.startTime));
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

    const tr = timeRange.map(({ time, items }, rangeIndex, rangeArr) => {
        let hourHeight = 24 * 6;

        const tracks = items.map((track, tracksIndex, tracksArr) => {
            let posY = 0;
            let previousTrack;

            if (tracksIndex === 0 && rangeIndex > 0) {
                const previousHour = rangeArr[rangeIndex - 1];

                if (previousHour.items.length) {
                    previousTrack = last(previousHour.items);
                }
            } else {
                previousTrack = tracksArr[tracksIndex - 1];
            }

            if (tracksIndex === 0) {
                if (previousTrack && previousTrack.endsInNextHour) {
                    const roundedEndTime = previousTrack.startTime + (previousTrack.trackHeight * 60000);
                    const previousTrackMinutesInHour = differenceInMinutes(roundedEndTime, time);
                    const diff = differenceInMinutes(track.startTime, roundedEndTime);
                    posY = (previousTrackMinutesInHour * 24) + calculatePosY(diff);
                    hourHeight = posY + (track.trackHeight * 24);
                } else {
                    posY = calculatePosY(getMinutes(track.startTime));
                    hourHeight = posY + (track.trackHeight * 24);
                }
            } else {
                let offset = 0;

                if (
                    previousTrack.status === 'COMPLETE'
                    && track.startTime - previousTrack.endTime > 60000
                ) {
                    const diff = differenceInMinutes(track.startTime, previousTrack.endTime);
                    // offset = calculatePosY(diff);
                    offset = diff * (24 / 10);
                }

                posY = hourHeight + offset;
                hourHeight = posY + (track.trackHeight * 24);
            }

            // Last track in the hour and it does not end in the next hour
            // adjust the height of the hour
            if (tracksIndex + 1 === tracksArr.length && !track.endsInNextHour) {
                const roundedEndTime = track.startTime + (track.trackHeight * 60000);
                const diff = differenceInMinutes(addHours(time, 1), roundedEndTime);
                hourHeight = hourHeight + (calculatePosY(diff));
            }

            // Adjust height of the hour row if last track ends in the next hour
            if (track.endsInNextHour) {
                const roundedEndTime = track.startTime + (track.trackHeight * 60000);
                hourHeight = hourHeight - (getMinutes(roundedEndTime) * 24);
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

    return h.view('diary', {
        date: isoDate,
        hasBowie,
        items: tr,
        previous: previousDate.getFullYear() === 2019 ? formatQuery(previousDate) : null,
        next: nextDate.getFullYear() === 2019 ? formatQuery(nextDate) : null,
    });
}

module.exports = tracks;
