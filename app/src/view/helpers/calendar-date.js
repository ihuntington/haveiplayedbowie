'use strict';

const Handlebars = require('handlebars');
const format = require('date-fns/format');

Handlebars.registerHelper('calendar-date', function (date) {
    return format(new Date(date), 'iiii, do LLLL yyyy');
});
