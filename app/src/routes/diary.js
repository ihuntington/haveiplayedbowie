'use strict';

const process = require('process');
const addHours = require('date-fns/addHours');
const addMinutes = require('date-fns/addMinutes');
const addMilliseconds = require('date-fns/addMilliseconds');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const getMinutes = require('date-fns/getMinutes');
const getHours = require('date-fns/getHours');
const getTime = require('date-fns/getTime');
const set = require('date-fns/set');
const subMilliseconds = require('date-fns/subMilliseconds');
const { utcToZonedTime } = require('date-fns-tz');
const { head, last } = require('ramda');

const TEN_MINUTES_IN_PX = 24;
const SPOTIFY_START_DATE = utcToZonedTime(process.env.SPOTIFY_START_DATE, 'utc');

function getHourlyIntervals(dateLeft, dateRight) {
    if (dateLeft > dateRight) {
        throw new Error('Date 1 must be a date before Date 2');
    }

    const start = set(dateLeft, { minutes: 0, seconds: 0, milliseconds: 0 });
    const end = set(dateRight, { minutes: 0, seconds: 0, milliseconds: 0 });
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
    let endTime;
    let startTime;
    let duration = getDuration(ms);

    if (playedAt >= SPOTIFY_START_DATE) {
        endTime = playedAt;
        startTime = subMilliseconds(endTime, ms);
    } else {
        startTime = playedAt;
        endTime = addMilliseconds(startTime, ms);
    }

    let endsInNextHour = getHours(startTime) !== getHours(endTime);

    return {
        duration,
        startTime,
        endTime,
        endsInNextHour,
    };
}

function minutesInUnits(minutes) {
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
    const playedAt = utcToZonedTime(new Date(track.played_at), 'utc');

    return {
        ...track,
        ...getTrackTimings(playedAt, track.track.duration),
    };
}

function calculateTrackHeight(track, index, arr) {
    const ONE_MINUTE = 60000;
    const MIN_TRACK_DURATION_IN_MINUTES = 3;

    const roundedDuration = Math.round((track.duration.ms / 1000) / 60);

    let skipped = false;
    let trackHeight = Math.max(MIN_TRACK_DURATION_IN_MINUTES, roundedDuration);

    if (index + 1 !== arr.length) {
        const nextTrack = arr[index + 1];
        const difference = nextTrack.startTime - track.endTime;

        if (track.startTime === nextTrack.startTime) {
            skipped = true;
        }

        if (difference > 0 && difference <= ONE_MINUTE) {
            trackHeight = Math.max(MIN_TRACK_DURATION_IN_MINUTES, differenceInMinutes(nextTrack.startTime, track.startTime));
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
    const scrobblesWithTimings = scrobbles.map(addTrackTimings).map(calculateTrackHeight);
    const firstDate = head(scrobblesWithTimings).startTime;
    const lastDate = last(scrobblesWithTimings).startTime;
    const intervals = getHourlyIntervals(firstDate, lastDate);
    const diaryMap = createMapFromIntervals(intervals);

    for (const track of scrobblesWithTimings) {
        const hour = getTime(set(track.startTime, { minutes: 0, seconds: 0, milliseconds: 0 }));
        diaryMap[hour].tracks.push(track);
    }

    const tr = Object.values(diaryMap).map(({hour, tracks}, rangeIndex, rangeArr) => {
        let hourHeight = TEN_MINUTES_IN_PX * 6;

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
                    posY = (previousTrackMinutesInHour * TEN_MINUTES_IN_PX) + minutesInUnits(diff);
                    hourHeight = posY + (track.trackHeight * TEN_MINUTES_IN_PX);
                } else {
                    posY = minutesInUnits(getMinutes(track.startTime));
                    hourHeight = posY + (track.trackHeight * TEN_MINUTES_IN_PX);
                }
            } else {
                let offset = 0;

                if (
                    previousTrack.track_duration &&
                    track.startTime - previousTrack.endTime > 60000
                ) {
                    const diff = differenceInMinutes(track.startTime, previousTrack.endTime);
                    offset = diff * (TEN_MINUTES_IN_PX / 10);
                }

                posY = hourHeight + offset;
                hourHeight = posY + (track.trackHeight * TEN_MINUTES_IN_PX);
            }

            // Last track in the hour and it does not end in the next hour
            // adjust the height of the hour
            if (tracksIndex + 1 === tracksArr.length && !track.endsInNextHour) {
                const roundedEndTime = addMinutes(track.startTime, track.trackHeight);
                const diff = differenceInMinutes(addHours(hour, 1), roundedEndTime);
                hourHeight = hourHeight + (minutesInUnits(diff));
            }

            // Adjust height of the hour row if last track ends in the next hour
            if (track.endsInNextHour) {
                const roundedEndTime = addMinutes(track.startTime, track.trackHeight);
                hourHeight = hourHeight - (getMinutes(roundedEndTime) * TEN_MINUTES_IN_PX);
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
