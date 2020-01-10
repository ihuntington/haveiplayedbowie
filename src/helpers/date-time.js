'use strict';

const Handlebars = require('handlebars');
const formatISO = require('date-fns/formatISO');

Handlebars.registerHelper('date-time', function (timestamp) {
    return formatISO(timestamp, { format: 'basic' });
});
