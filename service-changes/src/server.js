'use strict';

const process = require('process');

if (process.env.NODE_ENV === 'production') {
    require('@google-cloud/debug-agent').start({
        allowExpressions: true,
    });
}

const Hapi = require('@hapi/hapi');
const db = require('./db');
const Spotify = require('./spotify');

async function getRecentlyPlayed(user) {
    const spotify = new Spotify(user.token, user.refresh_token);
    const after = user.recently_played_at && user.recently_played_at.getTime() || null;
    const output = {
        user
    };

    try {
        const { tokens, data } = await spotify.recentlyPlayed(after);

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
            const data = await db.importTrack(uid, item);
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

const server = Hapi.server({
    host: '0.0.0.0',
    port: process.env.PORT || 3010,
});

server.route({
    method: 'GET',
    path: '/recently-played',
    handler: async (request, h) => {
        if (
            process.env.NODE_ENV === 'production' &&
            !request.headers['x-appengine-cron']
        ) {
            return h.redirect('https://www.haveiplayedbowie.today');
        }

        let users;

        try {
            users = await db.getUsersByRecentlyPlayed();
        } catch (err) {
            console.log('Cannot fetch users');
            console.log(err.stack);
            return h.response().code(500);
        }

        const recentlyPlayedGenerator = makeRecentlyPlayedGenerator(users);
        const data = [];

        // TODO: I feel like there is a better way to do this
        for await (const result of recentlyPlayedGenerator) {
            console.log('Import tracks status', result.status);
            if (result.status === 'success') {
                data.push(result.data);
            } else {
                console.log(result.message);
            }
        }

        if (process.env.NODE_ENV === 'development') {
            return h.response({ data }).code(200);
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
    console.log(err);
    // TODO: check how this will be handled on GAE
    process.exit(1);
});
