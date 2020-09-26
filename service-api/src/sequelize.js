'use strict';

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.SQL_DB);

module.exports = sequelize;
