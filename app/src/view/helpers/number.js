'use strict';

const Handlebars = require('handlebars');

Handlebars.registerHelper('number', function (number) {
    return new Intl.NumberFormat('en-GB', { style: 'decimal' }).format(number);
});
