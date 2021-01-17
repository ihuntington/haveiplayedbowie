'use strict';

const Spotify = require('../library/spotify');

const plugin = {
    name: 'app/listens',
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
                handler: async (request, h) => {
                    const { played_at, segment }  = request.payload;
                    const spotify = new Spotify();

                    let trackId = null;
                    let track = null;

                    if (segment.uris && segment.uris.length) {
                        const service = segment.uris.find((service) => {
                            return service.id === "commercial-music-service-spotify";
                        });

                        if (service) {
                            trackId = Spotify.extractTrackId(service.uri);
                        }
                    }

                    if (trackId) {
                        track =  await spotify.getTrackById(trackId);
                    }

                    // TODO if not found on spotify
                    if (track) {
                        const user = request.auth.credentials.id;
                        const listen = await services.scrobbles.add(user, played_at, track);

                        if (listen) {
                            return h.response().code(201);
                        }
                    }
                },
                cors: {
                    origin: [process.env.APP_CORS_ORIGIN],
                    credentials: true,
                },
            },
        });
    },
};

module.exports = plugin;
