const Hapi = require('@hapi/hapi');
const Bell = require('@hapi/bell');
const Vision = require('@hapi/vision');
const handlebars = require('handlebars');
const Firestore = require('@google-cloud/firestore');
const { isToday } = require('./dates');
const SpotifyClient = require('./spotify');

// david bowie '0oSGxfWSnnOXhD2fKuz2Gy';
// paul simon '2CvCyf1gEVhI0mX6aFXmVI';
const ARTIST_ID = process.env.SPOTIFY_ARTIST_ID;

const firestore = new Firestore();
const users = firestore.collection('users');

function isArtist({ track }) {
  return track.artists.find(({ id }) => id === ARTIST_ID);
}

const start = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 8080,
    host: '0.0.0.0',
  });

  await server.register(Bell);
  await server.register(Vision);

  server.auth.strategy('spotify', 'bell', {
    provider: 'spotify',
    password: process.env.BELL_STRATEGY_PASSWORD,
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    scope: [process.env.SPOTIFY_SCOPES],
    isSecure: process.env.BELL_STRATEGY_SECURE === 'true',
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

        try {
          const query = firestore.collection('users').where('id', '==', request.auth.credentials.profile.id);
          const querySnapshot = await query.get();

          if (querySnapshot.docs.length === 0) {
            const userRef = firestore.collection('users').doc();
            await userRef.create({
              id: request.auth.credentials.profile.id,
              token: request.auth.credentials.token,
              refreshToken: request.auth.credentials.refreshToken,
            });
          }
        } catch (err) {
          console.log(err);
          return 'Unable to create account';
        }

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
        return h.view('no');
      }

      const user = snapshot.docs[0];
      const spotify = new SpotifyClient(user.data());

      let recentlyPlayedTracks = [];
      let hasTokenExpired = false;

      try {
        recentlyPlayedTracks = await spotify.getRecentlyPlayed();
      } catch (err) {
        if (err.response.status === 401) {
          hasTokenExpired = true;
        } else {
          console.log(err);
          return h.view('no');
        }
      }

      if (hasTokenExpired) {
        try {
          const auth = await spotify.refreshToken();
          await user.ref.update({
            token: auth.access_token,
          });
          spotify.credentials = {
            token: auth.access_token,
          };
        } catch (err) {
          console.log(err);
          return h.view('no');
        }
      }

      try {
        recentlyPlayedTracks = await spotify.getRecentlyPlayed();
      } catch (err) {
        console.log(err);
        return h.view('no');
      }

      const tracksByArtist = recentlyPlayedTracks.data.items.filter(isArtist)
      const tracksPlayedToday = tracksByArtist.filter(({ played_at }) => isToday(new Date(played_at)));
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
