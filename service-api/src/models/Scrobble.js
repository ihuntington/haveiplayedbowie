'use strict'

const { DataTypes } = require('sequelize')

const sequelize = require('../sequelize')
const Artist = require('./Artist')
const User = require('./User')

const Scrobble = sequelize.define('scrobble', {
    id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    track_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Artist,
            key: 'id',
        },
    },
    played_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    user_id: {
        type: DataTypes.UUIDV4,
        references: {
            model: User,
            key: 'id',
        },
    },
}, {
    timestamps: false,
    underscored: true,
})

module.exports = Scrobble
