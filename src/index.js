const Hapi = require('@hapi/hapi');
const Bell = require('@hapi/bell');
const Vision = require('@hapi/vision');
const handlebars = require('handlebars');
const Firestore = require('@google-cloud/firestore');
const { isToday } = require('./dates');
const SpotifyClient = require('./spotify');

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
    isSecure: process.env.NODE_ENV === 'production',
  });

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
    method: ['GET', 'POST'],
    path: '/auth/spotify',
    options: {
      auth: 'spotify',
      handler: async function (request, h) {
        let userRef = null;

        if (!request.auth.isAuthenticated) {
          console.log('Authentication failed, redirect to page stating this');
          return h.redirect('/');
        }

        const credentials = request.auth.credentials;
        const profile = credentials.profile;
        const query = users.where('id', '==', profile.id);

        try {
          const snapshot = await query.get();

          if (snapshot.empty) {
            userRef = users.doc();
            await userRef.create({
              id: profile.id,
              token: credentials.token,
              refreshToken: credentials.refreshToken,
              profile: {
                displayName: profile.displayName,
                image: (!!profile.raw.images.length && profile.raw.images[0].url) || null,
              },
            });

            h.state('data', {
              id: userRef.id,
            });

            return h.redirect('/');
          }

          userRef = snapshot.docs[0].ref;

          await userRef.update({
            id: profile.id,
            token: credentials.token,
            refreshToken: credentials.refreshToken,
            profile: {
              displayName: profile.displayName,
              image: (!!profile.raw.images.length && profile.raw.images[0].url) || null,
            },
          });

          h.state('data', {
            id: userRef.id,
          });

          return h.redirect('/');
        } catch (err) {
          console.log('There was an error creating or updating user');
          console.log(err);
          return h.redirect('/').unstate('data');
        }
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
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
        return h.view('no').unstate('data');
      },
    });

    server.route({
      method: ['GET'],
      path: '/auth-no',
      handler: function (request, h) {
        return h.view('no');
      },
    });
  }

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
      const { state } = request;

      if (!state.data || !state.data.id) {
        return h.view('no', {
          authenticated: false,
        });
      }

      const userRef = users.doc(state.data.id);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return h.view('no', {
          authenticated: false,
        });
      }

      const spotify = new SpotifyClient({
        token: userDoc.data().token,
        refreshToken: userDoc.data().refreshToken,
      });

      let recentlyPlayedTracks = [];
      let hasTokenExpired = false;

      try {
        recentlyPlayedTracks = await spotify.getRecentlyPlayed();
      } catch (err) {
        if (err.response.status === 401) {
          hasTokenExpired = true;
        } else {
          console.log('Unable to fetch recently played tracks');
          console.log(err);
          return h.view('no', {
            authenticated: true,
            user: userDoc.data().profile,
            message: {
              text: 'Unable to get your recently played tracks.',
            },
          });
        }
      }

      if (hasTokenExpired) {
        try {
          const auth = await spotify.refreshToken();
          await userRef.update({
            token: auth.access_token,
          });
          spotify.credentials = {
            token: auth.access_token,
          };
        } catch (err) {
          console.log('Unable to fetch refresh token');
          console.log(err);
          return h.view('no', {
            authenticated: true,
            user: userDoc.data().profile,
            message: {
              text: 'Unable to get your recently played tracks.',
            },
          });
        }
      }

      try {
        recentlyPlayedTracks = await spotify.getRecentlyPlayed();
      } catch (err) {
        console.log('Unable to fetch recently played tracks');
        console.log(err);
        return h.view('no', {
          authenticated: true,
          user: userDoc.data().profile,
          message: {
            text: 'Unable to get your recently played tracks.',
          },
        });
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
        return h.view('no', {
          authenticated: true,
          user: userDoc.data().profile,
          tracks: [],
        });
      }

      return h.view('yes', {
        authenticated: true,
        user: userDoc.data().profile,
        tracks,
      });
    }
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
});

start();
