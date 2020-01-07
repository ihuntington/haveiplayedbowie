'use strict';

if (process.env.NODE_ENV === 'production') {
  require('@google-cloud/debug-agent').start();
}

const process = require('process');
const Hapi = require('@hapi/hapi');
const Vision = require('@hapi/vision');
const handlebars = require('handlebars');
const { Pool } = require('pg');

const config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DATABASE,
};

if (
  process.env.INSTANCE_CONNECTION_NAME &&
  process.env.NODE_ENV === 'production'
) {
  config.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
}

const pool = new Pool(config);

const start = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 8080,
    host: '0.0.0.0',
  });

  await server.register(Vision);

  server.views({
    engines: {
      hbs: handlebars,
    },
    relativeTo: __dirname,
    path: 'templates',
  });

  server.state('data', {
    ttl: 604800000,
    isSecure: process.env.NODE_ENV === 'production',
    isHttpOnly: true,
    encoding: 'base64json',
    clearInvalid: true,
    strictHeader: true,
    isSameSite: 'Lax',
    path: '/',
  });

  server.route({
    method: ['GET'],
    path: '/check',
    handler: function (request, h) {
      return `ok`;
    },
  });

  server.route({
    method: ['GET'],
    path: '/',
    handler: async function (request, h) {
      try {
        const artists = await pool.query('SELECT * FROM artists');
        return artists.rows;
      } catch (err) {
        console.log(err);
        return h.status(500);
      }
    }
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
});

start();
