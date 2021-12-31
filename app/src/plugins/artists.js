'use strict';

const Joi = require('joi');
const artists = require('../services/artists');
const charts = require('../services/charts');

const plugin = {
    name: 'app/artists',
    register: async (server) => {
        server.route({
            method: 'GET',
            path: '/artists/{aid}',
            handler: async (request, h) => {
                const { aid } = request.params;

                const [artist, tracks] = await Promise.all([
                    artists.getArtistById(aid),
                    charts.getTopTracks({ artist: aid, limit: 10, }),
                ]);

                if (!artist) {
                    h.response().code(404);
                }

                // const spotifyArtist = await request.server.methods.spotify.artist({ id: artist.spotify_id });

                return h.view('artist', {
                    artist,
                    year: new Date().getUTCFullYear(),
                    tracks: tracks.items,
                });
            },
            options: {
                validate: {
                    query: Joi.object({
                        from: Joi.date().iso(),
                        to: Joi.date().iso(),
                    }),
                },
            },
        });
    },
};

module.exports = plugin;
