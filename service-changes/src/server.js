'use strict';

const process = require('process');
const Hapi = require('@hapi/hapi');
const Wreck = require('@hapi/wreck');
const Spotify = require('./spotify');

async function getRecentlyPlayed(user) {
    const spotify = new Spotify(user.token, user.refresh_token);
    const after = user.recently_played_at && new Date(user.recently_played_at).getTime() || null;
    const { tokens, data } = await spotify.recentlyPlayed(after);
    return Promise.resolve({ tokens, tracks: data.items });
}

async function* makeRecentlyPlayedGenerator(users) {
    for (const user of users) {
        try {
            const { tokens, tracks }  = await getRecentlyPlayed(user);
            yield {
                user,
                tokens: {
                    token: tokens.token,
                    refresh_token: tokens.refreshToken,
                },
                tracks,
            };
        } catch (e) {
            console.error(e);
            yield {
                user,
                tokens: { token: null, refresh_token: null },
                tracks: [],
            };
        }
    }
}

const server = Hapi.server({
    host: '0.0.0.0',
    port: process.env.PORT || 6000,
});

server.route({
    method: 'GET',
    path: '/',
    handler: async (request, h) => {
        let users;

        try {
            users = await Wreck.get(`${process.env.SERVICE_API_URL}/users/recently-played`, { json: true });
        } catch (err) {
            console.log('Cannot fetch users by recently played');

            return h.response().code(500);
        }

        if (users.payload.users.length === 0) {
            return { scrobbles: [] };
        }

        const recentlyPlayedIterator = makeRecentlyPlayedGenerator(users.payload.users);
        const data = [];

        for await (const { user, tokens, tracks } of recentlyPlayedIterator) {
            if (user.token !== tokens.token || user.refresh_token !== tokens.refresh_token) {
                try {
                    await Wreck.patch(`${process.env.SERVICE_API_URL}/users/${user.id}`, {
                        payload: { ...tokens },
                    });
                } catch (e) {
                    console.log('Unable to update tokens for user', user.id);
                }
            }

            try {
                const response = await Wreck.post(`${process.env.SERVICE_API_URL}/scrobbles`, {
                    payload: { user: user.id, items: tracks },
                    json: true,
                });

                data.push({
                    user: user.id,
                    scrobbles: response.payload.scrobbles,
                });
            } catch (e) {
                console.log('Unable to add scrobbles for user', user.id);
            }
        }

        if (process.env.NODE_ENV === 'development') {
            return h.response({ scrobbles: data }).code(200);
        }

        return h.response().code(200);
    },
});

exports.init = async () => {
    await server.initialize();
    return server;
}

exports.start = async () => {
    await server.start();
    console.log(`Server running at ${server.info.uri}`);
    return server;
};

process.on('unhandledRejection', (err) => {
    console.log('Unhandled rejection');
    console.log(err);
    // TODO: check how this will be handled on GAE
    process.exit(1);
});
