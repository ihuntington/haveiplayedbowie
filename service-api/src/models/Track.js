'use strict'

const { DataTypes } = require('sequelize')

const sequelize = require('../sequelize')

const Track = sequelize.define('track', {
    id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    duration_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    spotify_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    timestamps: false,
    underscored: true,
})

module.exports = Track
