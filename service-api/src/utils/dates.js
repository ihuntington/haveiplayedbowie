'use strict';

const startOfYear = require('date-fns/startOfYear');
const startOfMonth = require('date-fns/startOfMonth');
const startOfWeek = require('date-fns/startOfWeek');

const getTruncatedDate = (date, period) => {
    if (period === 'year') {
        return startOfYear(date);
    }

    if (period === 'month') {
        return startOfMonth(date);
    }

    if (period === 'week') {
        return startOfWeek(date, { weekStartsOn: 1 });
    }

    return date;
};

module.exports = {
    getTruncatedDate,
};
