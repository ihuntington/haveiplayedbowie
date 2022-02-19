"use strict";

const Handlebars = require('handlebars');

Handlebars.registerHelper("coverImage", (images) => {
    return images[images.length -1 ].url;
});
