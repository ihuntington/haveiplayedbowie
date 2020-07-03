'use strict';

const Handlebars = require('handlebars');
const format = require('date-fns/format');

Handlebars.registerHelper('time', function (timestamp) {
    return format(new Date(timestamp), 'HH:mm');
});
