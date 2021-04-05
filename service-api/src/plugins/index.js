const db = require('./db');
const artists = require('./artists');
const charts = require('./charts');
const scrobbles = require('./scrobbles');
const tracks = require('./tracks');
const users = require('./users');

module.exports = {
    artists,
    db,
    charts,
    scrobbles,
    tracks,
    users,
};
