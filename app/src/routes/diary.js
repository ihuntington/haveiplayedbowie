'use strict';

const addHours = require('date-fns/addHours');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const getMinutes = require('date-fns/getMinutes');
const getHours = require('date-fns/getHours');
const { head, last } = require('ramda');

function getHourlyIntervals(dateLeft, dateRight) {
    const MILLISECONDS_IN_HOUR = 3600000;

    if (dateLeft > dateRight) {
        throw new Error('Date 1 must be a date before Date 2');
    }

    const start = new Date(dateLeft).setMinutes(0, 0, 0);
    const end = new Date(dateRight).setMinutes(0, 0, 0);
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
        ...getTrackTimings(track.played_at, track.track_duration),
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
        const hour = intervals[i].getTime();
        map[hour] = {
            hour,
            tracks: [],
        };
    }
    return map;
}

function diary(scrobbles) {
    const firstDate = head(scrobbles).played_at;
    const lastDate = last(scrobbles).played_at;
    const intervals = getHourlyIntervals(firstDate, lastDate);
    const diaryMap = createMapFromIntervals(intervals);
    const tracksWithTimes = scrobbles.map(addTrackTimings).map(calculateTrackHeight);

    for (const track of tracksWithTimes) {
        const hour = new Date(track.played_at).setMinutes(0, 0, 0);
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
                    const roundedEndTime = previousTrack.startTime + (previousTrack.trackHeight * 60000);
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
                const roundedEndTime = track.startTime + (track.trackHeight * 60000);
                const diff = differenceInMinutes(addHours(hour, 1), roundedEndTime);
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
            time: hour,
            items,
            hourHeight,
        };
    });

    return tr;
}

module.exports = diary;
