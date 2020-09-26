'use strict';

const { DataTypes } = require('sequelize');

const sequelize = require("../sequelize");

const Artist = sequelize.define('artist', {
    id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    spotify_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    timestamps: false,
    underscored: true,
})

module.exports = Artist;
