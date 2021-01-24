'use strict';

const Boom = require('@hapi/boom');
const services = require('../services');
const Spotify = require('../library/spotify');

const getSpotifyService = (segment) => {
    if (!segment.uris || !segment.uris.length) {
        return;
    }

    return segment.uris.find(service => service.id === "commercial-music-service-spotify");
};

const convertSegmentToTrack = (segment) => {
    return {
        artists: [
            {
                name: segment.titles.primary,
            },
        ],
        duration_ms: null,
        name: segment.titles.secondary,
    };
};

const postApiListensHandler = async (request, h) => {
    const user = request.auth.credentials.id;
    const { played_at, segment, service }  = request.payload;
    const externalService = getSpotifyService(segment);

    let track = null;

    if (externalService) {
        const trackId  = Spotify.extractTrackId(externalService.uri);

        if (trackId) {
            const spotify = new Spotify();
            track = await spotify.getTrackById(trackId);
        }
    }

    if (!track) {
        track = convertSegmentToTrack(segment);
    }

    const listen = await services.scrobbles.add(user, played_at, service, track);

    if (!listen) {
        console.log('Unable to add listen from BBC Sounds');
        return Boom.badRequest("Unable to add listen");
    }

    return h.response().code(201);
};

const plugin = {
    name: 'app/listens',
    dependencies: ['@hapi/cookie'],
    register: async (server) => {
        server.route({
            method: 'POST',
            path: '/api/listens',
            options: {
                auth: {
                    strategy: 'session',
                    mode: 'required',
                },
                plugins: {
                    'hapi-auth-cookie': {
                        // disable redirect to /login for an API route
                        redirectTo: false,
                    },
                },
                handler: postApiListensHandler,
                cors: {
                    origin: [process.env.APP_CORS_ORIGIN],
                    credentials: true,
                },
            },
        });
    },
};

module.exports = plugin;
