'use strict';

const Handlebars = require('handlebars');
const format = require('date-fns/format');

Handlebars.registerHelper('date-month-year', function (timestamp) {
    return format(timestamp, 'LLLL');
});
