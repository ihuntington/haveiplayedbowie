'use strict';

const process = require('process');
const Hapi = require('@hapi/hapi');
const db = require('./db');
const Spotify = require('./spotify');

async function getRecentlyPlayed(user) {
    const spotify = new Spotify(user.token, user.refresh_token);
    const output = {
        user
    };

    try {
        const { tokens, data } = await spotify.recentlyPlayed();

        output.user.token = tokens.token;
        output.user.refresh_token = tokens.refreshToken;

        output.tracks = data.items.map((item) => ({
            artists: item.track.artists,
            duration_ms: item.track.duration_ms,
            id: item.track.id,
            name: item.track.name,
            played_at: item.played_at,
        }));
    } catch (err) {
        console.log(err);
        output.error = err.message;
    }

    return new Promise((resolve) => resolve(output));
}

async function* importTracks(uid, items) {
    for (const item of items) {
        const output = {};

        try {
            const data = await db.importTracks(uid, item);
            output.status = 'success';
            output.data = data;
        } catch (err) {
            output.status = 'error';
            output.message = err.message;
        }

        yield output;
    }
}

async function* makeRecentlyPlayedGenerator(users) {
    for (const user of users) {
        const recentlyPlayed = await getRecentlyPlayed(user);
        const { id: uid, token, refresh_token } = recentlyPlayed.user;

        await db.updateUserTokens(uid, token, refresh_token);

        yield* importTracks(uid, recentlyPlayed.tracks);
    }
}

async function start() {
    const server = Hapi.server({
        host: '0.0.0.0',
        port: process.env.PORT || 3010,
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: async (request, h) => {
            // TODO: check that request came from Cron Task
            let users;

            try {
                users = await db.getUsers();
            } catch (err) {
                console.log('Cannot fetch users');
                console.log(err.stack);
                return h.response().code(500);
            }

            const recentlyPlayedGenerator = makeRecentlyPlayedGenerator(users);

            // I feel that there is probably a better way to do this
            for await (const result of recentlyPlayedGenerator) {
                console.log('Import tracks status', result.status);
                if (result.status === 'error') {
                    console.log(result.message);
                }
            }

            return h.response().code(200);
        },
    });

    await server.start();

    console.log('Server running at %s', server.info.uri);
}

start();
