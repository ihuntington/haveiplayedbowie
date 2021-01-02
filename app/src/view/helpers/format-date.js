'use strict';

const Handlebars = require('handlebars');
const format = require('date-fns/format');

Handlebars.registerHelper('format-date', function (timestamp, pattern = 'LLLL') {
    return format(new Date(timestamp), pattern);
});
