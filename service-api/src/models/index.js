'use strict'

const Artist = require('./Artist')
const ArtistTrack = require('./ArtistTrack')
const Scrobble = require('./Scrobble')
const Track = require('./Track')
const User = require('./User')

Artist.belongsToMany(Track, {
    through: ArtistTrack,
    foreignKey: 'artist_id',
})

Scrobble.belongsTo(Track, {
    foreignKey: 'track_id',
})

Scrobble.belongsTo(User,{
    foreignKey: 'user_id',
})

Track.belongsToMany(Artist, {
    through: ArtistTrack,
    foreignKey: 'track_id',
})

Track.hasMany(Scrobble, {
    foreignKey: 'track_id',
})

User.hasMany(Scrobble, {
    foreignKey: 'user_id',
})

module.exports = {
    Artist,
    ArtistTrack,
    Scrobble,
    Track,
    User,
}
