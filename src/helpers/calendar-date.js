'use strict';

const Handlebars = require('handlebars');
const format = require('date-fns/format');

Handlebars.registerHelper('calendar-date', function (timestamp) {
    return format(timestamp, 'iiii, do LLLL yyyy');
});
