'use strict'

const { DataTypes } = require('sequelize')

const sequelize = require('../sequelize')
const Artist = require('./Artist')
const Track = require('./Track')

const ArtistTrack = sequelize.define('artists_tracks', {
    artist_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Artist,
            key: 'id',
        },
    },
    track_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Track,
            key: 'id',
        },
    },
    artist_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    }
}, {
    timestamps: false,
    underscored: true,
    tableName: 'artists_tracks'
})

module.exports = ArtistTrack
