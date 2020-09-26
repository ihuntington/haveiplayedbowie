'use strict';

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = require("../sequelize");

const User = sequelize.define('user', {
    id: {
        type: DataTypes.UUIDV4,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    token: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    refresh_token: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING,
        validate: {
            max: 254,
        },
        allowNull: false,
        unique: true,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW,
    },
    modified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW,
    },
    profile: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    recently_played_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            max: 50,
            min: 2,
        },
        unique: true,
    },
    timezone: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: process.env.DEFAULT_TIMEZONE,
    },
}, {
    timestamps: false,
    underscored: true,
})

module.exports = User
