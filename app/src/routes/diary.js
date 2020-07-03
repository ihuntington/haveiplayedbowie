'use strict';

const addHours = require('date-fns/addHours');
const addMinutes = require('date-fns/addMinutes');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const getMinutes = require('date-fns/getMinutes');
const getHours = require('date-fns/getHours');
const getTime = require('date-fns/getTime');
const parseISO = require('date-fns/parseISO');
const set = require('date-fns/set');
const subMilliseconds = require('date-fns/subMilliseconds');
const { utcToZonedTime } = require('date-fns-tz');
const { head, last } = require('ramda');

function getHourlyIntervals(dateLeft, dateRight) {
    if (dateLeft > dateRight) {
        throw new Error('Date 1 must be a date before Date 2');
    }

    // const d1 = set(new Date(dateLeft), { minutes: 0, seconds: 0, milliseconds: 0 });
    // const d2 = set(new Date(dateRight), { minutes: 0, seconds: 0, milliseconds: 0 });
    const start = set(dateLeft, { minutes: 0, seconds: 0, milliseconds: 0 });
    const end = set(dateRight, { minutes: 0, seconds: 0, milliseconds: 0 });
    // const start = utcToZonedTime(d1, 'utc');
    // const end = utcToZonedTime(d2, 'utc');
    const intervals = [];

    let current = start;

    while (current <= end) {
        intervals.push(current);
        current = addHours(current, 1);
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
    let endTime = utcToZonedTime(new Date(playedAt), 'utc');
    let startTime = subMilliseconds(endTime, ms);
    let endsInNextHour = getHours(startTime) !== getHours(endTime);

    return {
        duration,
        startTime,
        endTime,
        endsInNextHour,
    };
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

    const tens = Math.floor(minutes / 10) * TEN_MINUTES_IN_PX;
    const ones = (minutes % 10) * (TEN_MINUTES_IN_PX / 10);

    return tens + ones;
}

function addTrackTimings(track) {
    return {
        ...track,
        ...getTrackTimings(track.played_at, track.track.duration),
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

function createMapFromIntervals(intervals) {
    const map = {};
    for (let i = 0; i < intervals.length; i++) {
        const hour = getTime(intervals[i]);
        map[hour] = {
            hour,
            tracks: [],
        };
    }
    return map;
}

function diary(scrobbles) {
    const tracksWithTimes = scrobbles.map(addTrackTimings).map(calculateTrackHeight);
    const firstDate = head(tracksWithTimes).startTime;
    const lastDate = last(tracksWithTimes).startTime;
    const intervals = getHourlyIntervals(firstDate, lastDate);
    const diaryMap = createMapFromIntervals(intervals);

    for (const track of tracksWithTimes) {
        const hour = getTime(set(track.startTime, { minutes: 0, seconds: 0, milliseconds: 0 }));
        diaryMap[hour].tracks.push(track);
    }

    const tr = Object.values(diaryMap).map(({hour, tracks}, rangeIndex, rangeArr) => {
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
                    const roundedEndTime = addMinutes(previousTrack.startTime, previousTrack.trackHeight);
                    const previousTrackMinutesInHour = differenceInMinutes(roundedEndTime, hour);
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
                    previousTrack.track_duration &&
                    track.startTime - previousTrack.endTime > 60000
                ) {
                    const diff = differenceInMinutes(track.startTime, previousTrack.endTime);
                    offset = diff * (24 / 10);
                }

                posY = hourHeight + offset;
                hourHeight = posY + (track.trackHeight * 24);
            }

            // Last track in the hour and it does not end in the next hour
            // adjust the height of the hour
            if (tracksIndex + 1 === tracksArr.length && !track.endsInNextHour) {
                const roundedEndTime = addMinutes(track.startTime, track.trackHeight);
                const diff = differenceInMinutes(addHours(hour, 1), roundedEndTime);
                hourHeight = hourHeight + (calculatePosY(diff));
            }

            // Adjust height of the hour row if last track ends in the next hour
            if (track.endsInNextHour) {
                const roundedEndTime = addMinutes(track.startTime, track.trackHeight);
                hourHeight = hourHeight - (getMinutes(roundedEndTime) * 24);
            }

            return {
                ...track,
                posY,
            }
        });

        return {
            time: hour,
            items,
            hourHeight,
        };
    });

    return tr;
}

module.exports = diary;
