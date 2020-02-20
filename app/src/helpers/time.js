'use strict';

const MILLISECONDS_IN_HOUR = 3600000;

function getHourlyIntervals(firstDate, lastDate) {
    if (firstDate > lastDate) {
        throw new Error('Date 1 must be a date before Date 2');
    }

    const start = new Date(firstDate).setMinutes(0, 0, 0);
    const end = new Date(lastDate).setMinutes(0, 0, 0);
    const dates = [];

    let current = new Date(start).getTime();

    while (current <= end) {
        dates.push(new Date(current));
        current += MILLISECONDS_IN_HOUR;
    }

    return dates;
}

module.exports = {
    getHourlyIntervals,
};
