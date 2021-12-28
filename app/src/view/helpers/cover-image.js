"use strict";

const Handlebars = require('handlebars');

Handlebars.registerHelper("coverImage", (images) => {
    console.log(images)
    return images[images.length -1 ].url;
});
