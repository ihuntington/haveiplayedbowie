'use strict';

const process = require('process');
const addDays = require('date-fns/addDays');
const addHours = require('date-fns/addHours');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const formatISO = require('date-fns/formatISO');
const getHours = require('date-fns/getHours');
const getMinutes = require('date-fns/getMinutes');
const parseISO = require('date-fns/parseISO');
const { head, last } = require('ramda');

const db = require('../db');

function getHourlyIntervals(dateLeft, dateRight) {
    const MILLISECONDS_IN_HOUR = 3600000;

    if (dateLeft > dateRight) {
        throw new Error('Date 1 must be a date before Date 2');
    }

    const start = dateLeft.setMinutes(0, 0, 0);
    const end = dateRight.setMinutes(0, 0, 0);
    const intervals = [];

    let current = start;

    while (current <= end) {
        intervals.push(new Date(current));
        current += MILLISECONDS_IN_HOUR;
    }

    return intervals;
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

/**
 * @typedef {Object} Timings
 * @property {number} duration
 *  The duration in milliseconds
 * @property {number} endTime
 *  The end time in milliseconds
 * @property {number} startTime
 *  The start time in milliseconds
 * @property {boolean} endsInNextHour
 *  Ends in the hour after the start time
 */

/**
 * @function
 * @param {date} playedAt
 *  When the track was played
 * @param {*} ms
 *  Track duration in milliseconds
 * @returns {Timings}
 *  The timings of the track
 */
function getTrackTimings(playedAt, ms = 3 * 60000) {
    let duration = getDuration(ms);
    let startTime = playedAt.getTime();
    let endTime = startTime + 3 * 60000;
    let endsInNextHour = getHours(startTime) !== getHours(endTime);

    return {
        duration,
        startTime,
        endTime,
        endsInNextHour,
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

function addTrackTimings(track) {
    return {
        ...track,
        ...getTrackTimings(track.played_at, track.duration_ms),
    }
}

function calculateTrackHeight(track, index, arr) {
    const ONE_MINUTE = 60000;
    const roundedDuration = Math.round((track.duration.ms / 1000) / 60);
    let skipped = false;
    // The minimum track height is 3 minutes
    let trackHeight = Math.max(3, roundedDuration);

    if (index + 1 !== arr.length) {
        const nextTrack = arr[index + 1];
        const difference = nextTrack.startTime - track.endTime;

        if (track.startTime === nextTrack.startTime) {
            skipped = true;
        }

        if (difference > 0 && difference <= ONE_MINUTE) {
            trackHeight = Math.max(3, differenceInMinutes(nextTrack.startTime, track.startTime));
        }
    }

    return {
        ...track,
        trackHeight,
        skipped,
    };
}

async function tracks(request, h) {
    const formatDate = (date) => formatISO(date, { representation: 'date' });
    const formatQuery = (date) => `${request.path}?date=${formatDate(date)}`;
    const isoDate = parseISO(request.query.date || formatDate(Date.now()));
    const previousDate = addDays(isoDate, -1);
    const nextDate = addDays(isoDate, 1);

    const response = await db.getTracksByDate(isoDate);

    if (response.length === 0) {
        return h.view('diary', {
            date: isoDate,
            hasBowie: false,
            items: [],
            previous: previousDate.getFullYear() > 2018 ? formatQuery(previousDate) : null,
            next: nextDate.getFullYear() > 2018 ? formatQuery(nextDate) : null,
        });
    }

    const hasBowie = response.filter(filterByBowie);
    const firstDate = head(response).played_at;
    const lastDate = last(response).played_at;
    const intervals = getHourlyIntervals(firstDate, lastDate);
    const tracksByHour = intervals.map((timestamp) => ({ timestamp, tracks: [] }));
    const tracksWithTimes = response.map(addTrackTimings).map(calculateTrackHeight);

    for (const track of tracksWithTimes) {
        const targetHour = tracksByHour.findIndex(({ timestamp }) => {
            return timestamp.getDate() === track.played_at.getDate() && timestamp.getHours() === track.played_at.getHours();
        });

        if (targetHour) {
            tracksByHour[targetHour].tracks.push({ ...track });
        }
    }

    const tr = tracksByHour.map(({ timestamp, tracks }, rangeIndex, rangeArr) => {
        let hourHeight = 24 * 6;

        const items = tracks.map((track, tracksIndex, tracksArr) => {
            let posY = 0;
            let previousTrack;

            if (tracksIndex === 0 && rangeIndex > 0) {
                const previousHour = rangeArr[rangeIndex - 1];

                if (previousHour.tracks.length) {
                    previousTrack = last(previousHour.tracks);
                }
            } else {
                previousTrack = tracksArr[tracksIndex - 1];
            }

            if (tracksIndex === 0) {
                if (previousTrack && previousTrack.endsInNextHour) {
                    const roundedEndTime = previousTrack.startTime + (previousTrack.trackHeight * 60000);
                    const previousTrackMinutesInHour = differenceInMinutes(roundedEndTime, timestamp);
                    const diff = differenceInMinutes(track.startTime, roundedEndTime);
                    posY = (previousTrackMinutesInHour * 24) + calculatePosY(diff);
                    hourHeight = posY + (track.trackHeight * 24);
                } else {
                    posY = calculatePosY(getMinutes(track.startTime));
                    hourHeight = posY + (track.trackHeight * 24);
                }
            } else {
                let offset = 0;

                if (track.startTime - previousTrack.endTime > 60000) {
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
                const diff = differenceInMinutes(addHours(timestamp, 1), roundedEndTime);
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
            time: timestamp,
            items,
            hourHeight,
        };
    });

    return h.view('diary', {
        date: isoDate,
        hasBowie,
        items: tr,
        previous: previousDate.getFullYear() > 2018 ? formatQuery(previousDate) : null,
        next: nextDate.getFullYear() > 2018 ? formatQuery(nextDate) : null,
    });
}

module.exports = tracks;
