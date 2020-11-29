'use strict';

const Handlebars = require('handlebars');
const formatDuration = require('date-fns/formatDuration');
const intervalToDuration = require('date-fns/intervalToDuration');

Handlebars.registerHelper('duration', function (ms) {
    if (!ms) {
        return '';
    }

    const minutes = Math.floor((ms / 1000) / 60);
    const seconds = Math.round((ms / 1000) % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

Handlebars.registerHelper('readable-duration', function (ms) {
    return formatDuration(intervalToDuration({ start: 0, end: ms }), { delimiter: ', ' });
});
