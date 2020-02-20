'use strict';

const addHours = require('date-fns/addHours');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const getMinutes = require('date-fns/getMinutes');
const isSameHour = require('date-fns/isSameHour');
const { head, last } = require('ramda');

const { getHourlyIntervals } = require('../helpers/time');
const defaultTrackDuration = 3 * 60000;

function getTrackTimings({ track_duration = defaultTrackDuration, ...track }) {
    // const durationInMilliseconds = !!track.duration_ms|| defaultTrackLength;
    const roundedDuration = Math.round((track_duration / 1000) / 60);
    const startTime = track.played_at.getTime();
    const endTime = startTime + track_duration;
    const endsInNextHour = !isSameHour(startTime, endTime);

    return {
        ...track,
        // TODO: map over db results setting a default duration and flagging the track
        track_duration,
        startTime,
        endTime,
        endsInNextHour,
        roundedDuration,
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

function createDiary(response) {
    const rangeOfItemsByHour = getHourlyIntervals(
        head(response).played_at,
        last(response).played_at
    ).map((time) => ({ time, items: [] }));

    const tracksWithTimes = response.map(getTrackTimings).map((track, index, tracksArr) => {
        const defaultTrackDurationInMinutes = (defaultTrackDuration / 1000) / 60;
        let roundedDuration = Math.max(defaultTrackDurationInMinutes, track.roundedDuration);
        let skipped = false;

        if (index + 1 !== tracksArr.length) {
            const nextTrack = tracksArr[index + 1];
            const differenceBetweenTracks = nextTrack.startTime - track.endTime;

            if (track.startTime === nextTrack.startTime) {
                skipped = true;
            }

            // TODO: if track defaults to 3 minutes yet there is one minute difference... what to do?
            // Have a 1 minute gap or increase the track height?
            if (differenceBetweenTracks > 0 && differenceBetweenTracks <= 60000) {
                roundedDuration = Math.max(3, differenceInMinutes(nextTrack.startTime, track.startTime));
            }
        }

        return {
            ...track,
            roundedDuration,
            skipped,
        }
    });

    for (const track of tracksWithTimes) {
        const hourTrackPlayed = rangeOfItemsByHour.findIndex((item) => {
            return item.time.getDate() === track.played_at.getDate()
                && item.time.getHours() === track.played_at.getHours();
        });

        rangeOfItemsByHour[hourTrackPlayed].items.push({ ...track });
    }

    const tracksByHour = rangeOfItemsByHour.map(({ time, items }, rangeIndex, rangeArr) => {
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
                    const roundedEndTime = previousTrack.startTime + (previousTrack.roundedDuration * 60000);
                    const previousTrackMinutesInHour = differenceInMinutes(roundedEndTime, time);
                    const diff = differenceInMinutes(track.startTime, roundedEndTime);
                    posY = (previousTrackMinutesInHour * 24) + calculatePosY(diff);
                    hourHeight = posY + (track.roundedDuration * 24);
                } else {
                    posY = calculatePosY(getMinutes(track.startTime));
                    hourHeight = posY + (track.roundedDuration * 24);
                }
            } else {
                let offset = 0;

                if (track.startTime - previousTrack.endTime > 60000) {
                    const diff = differenceInMinutes(track.startTime, previousTrack.endTime);
                    offset = diff * (24 / 10);
                }

                posY = hourHeight + offset;
                hourHeight = posY + (track.roundedDuration * 24);
            }

            // Last track in the hour and it does not end in the next hour
            // adjust the height of the hour
            if (tracksIndex + 1 === tracksArr.length && !track.endsInNextHour) {
                const roundedEndTime = track.startTime + (track.roundedDuration * 60000);
                const diff = differenceInMinutes(addHours(time, 1), roundedEndTime);
                hourHeight = hourHeight + calculatePosY(diff);
            }

            // Adjust height of the hour row if last track ends in the next hour
            if (track.endsInNextHour) {
                const roundedEndTime = track.startTime + (track.roundedDuration * 60000);
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

    return tracksByHour;
}

module.exports = createDiary;
