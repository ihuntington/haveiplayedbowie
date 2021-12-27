'use strict';

import startOfYear from 'date-fns/startOfYear';
import startOfMonth from 'date-fns/startOfMonth';
import startOfWeek from 'date-fns/startOfWeek';

export const getTruncatedDate = (date, period) => {
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
