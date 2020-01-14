'use strict';

const Handlebars = require('handlebars');

Handlebars.registerHelper('duration', function (ms) {
    if (!ms) {
        return '';
    }

    const minutes = Math.floor((ms / 1000) / 60);
    const seconds = Math.round((ms / 1000) % 60);

    return `${minutes}:${seconds}`;
});
