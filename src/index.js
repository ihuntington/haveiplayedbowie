'use strict';

const qs = require('querystring');
const Hapi = require('@hapi/hapi');
const Bell = require('@hapi/bell');
const Vision = require('@hapi/vision');
const axios = require('axios');
const handlebars = require('handlebars');
const Firestore = require('@google-cloud/firestore');

// david bowie '0oSGxfWSnnOXhD2fKuz2Gy';
// paul simon '2CvCyf1gEVhI0mX6aFXmVI';
const ARTIST_ID = process.env.SPOTIFY_ARTIST_ID;

const firestore = new Firestore();
const users = firestore.collection('users');

function isBowie({ track }) {
  return track.artists.find(({ id }) => id === ARTIST_ID);
}

function startOfDay(date) {
  return new Date(date.setHours(0, 0, 0, 0));
}

function isSameDay(dateA, dateB) {
  return startOfDay(dateA).getTime() === startOfDay(dateB).getTime();
}

function isToday(date) {
  return isSameDay(date, new Date());
}

function SpotifyClient(credentials) {
  const _credentials = credentials;
  const internals = {};

  internals.cred = _credentials;

  internals._makeRequest = async (config) => {
    return await axios.request(config);
  }

  internals.getAccessToken = async () => {
    const clientCredentials = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const data = qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: _credentials.refreshToken,
    });

    try {
      const request = await internals._makeRequest({
        url: 'https://accounts.spotify.com/api/token',
        method: 'POST',
        headers: {
          Authorization: `Basic ${clientCredentials}`
        },
        data,
      });
      return request;
    } catch (requestError) {
      throw 'Unable to get access token';
    }
  };

  internals.getRecentlyPlayed = async (attempts = 2) => {
    // try {
      const request = await internals._makeRequest({
        url: 'https://api.spotify.com/v1/me/player/recently-played',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${_credentials.token}`,
        },
        params: {
          limit: 50,
        },
      });
      return request.data;
    // } catch (requestError) {
      // if (attempts === 1) {
      //   throw 'Unable to get recently played tracks';
      // }

      // if (requestError.response.status === 401) {
      //   return internals.getAccessToken()
      // }
    // }
  };

  return internals;
}

const start = async () => {
  const server = Hapi.server({
    port: 3000,
    host: 'localhost',
  });

  await server.register(Bell);
  await server.register(Vision);

  server.auth.strategy('spotify', 'bell', {
    provider: 'spotify',
    password: process.env.BELL_STRATEGY_PASSWORD,
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    scope: [process.env.SPOTIFY_SCOPES],
    isSecure: false,
  });

  server.views({
    engines: {
      hbs: handlebars,
    },
    relativeTo: __dirname,
    path: 'templates',
  });

  server.route({
    method: ['GET', 'POST'],
    path: '/auth/spotify',
    options: {
      auth: 'spotify',
      handler: async function (request, h) {
        if (!request.auth.isAuthenticated) {
          return `Authentication failed due to: ${request.auth.error.message}`;
        }
        console.log(request.auth.credentials);
        try {
          const query = firestore.collection('users').where('id', '==', request.auth.credentials.profile.id);
          const querySnapshot = await query.get();

          if (querySnapshot.docs.length === 0) {
            const userRef = firestore.collection('users').doc();
            const user = await userRef.create({
              id: request.auth.credentials.profile.id,
              token: request.auth.credentials.token,
              refreshToken: request.auth.credentials.refreshToken,
            });
            console.log('User', user);
          }
        } catch (err) {
          console.log(err);
          return 'Blown up you have';
        }

        auth = request.auth.credentials;
        console.log(request.auth);

        return h.redirect('/');
      }
    }
  });

  server.route({
    method: ['GET'],
    path: '/yes',
    handler: function (request, h) {
      return h.view('yes');
    },
  });

  server.route({
    method: ['GET'],
    path: '/no',
    handler: function (request, h) {
      return h.view('no');
    },
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
      const query = users.where('id', '==', process.env.SPOTIFY_USER_ID);
      const snapshot = await query.get();

      if (snapshot.docs.length === 0) {
        return h.response('Have I Played Bowie Today?').code(200);
      }

      const user = snapshot.docs[0];
      const spotify = new SpotifyClient(user.data());

      let recentlyPlayedTracks;

      try {
        recentlyPlayedTracks = await spotify.getRecentlyPlayed();
      } catch (err) {
        if (err.response.status === 401) {
          const auth = await spotify.getAccessToken();
          await user.ref.update({
            token: auth.data.access_token,
          });
          recentlyPlayedTracks = await spotify.getRecentlyPlayed();
        }

        return 'Have I Played Bowie Today? Something went wrong :(';
      }

      const tracksByBowie = recentlyPlayedTracks.items.filter(isBowie);
      const tracksPlayedToday = tracksByBowie.filter(({ played_at }) => isToday(new Date(played_at)));
      const tracks = tracksPlayedToday.map(({ track }) => ({
        album: {
          image: track.album.images[1].url,
          name: track.album.name,
        },
        track: {
          name: track.name,
        }
      }));

      if (tracks.length === 0) {
        return h.view('no');
      }

      return h.view('yes', { tracks });
    }
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

// process.on('unhandledRejection', (err) => {
//   console.log(err);
// });

start();
