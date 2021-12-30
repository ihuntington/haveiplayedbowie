'use strict';

const Joi = require('joi');
const formatISO = require('date-fns/formatISO');

const services = require('../services');

const plugin = {
    name: 'app/home',
    register: async (server) => {
        server.route({
            method: 'GET',
            path: '/',
            options: {
                auth: {
                    strategy: 'session',
                    mode: 'optional',
                },
                handler: async (request, h) => {
                    const date = request.query.date ? new Date(request.query.date) : new Date();
                    const today = formatISO(date, { representation: 'date' });
                    const periods = ['day', 'week', 'month', 'year'];

                    const tracks = await Promise.all(periods.map(period => {
                        return services.scrobbles.getTotalByDate({
                            column: 'track',
                            date: today,
                            period,
                        });
                    }));

                    const durations = await Promise.all(periods.map(period => {
                        return services.scrobbles.getDurationByPeriod({
                            date: today,
                            period,
                        });
                    }));

                    const bowie = await Promise.all(periods.map(period => {
                        return services.scrobbles.getTotalByDate({
                            artist: process.env.BOWIE_ARTIST_ID,
                            date: today,
                            period,
                        });
                    }));

                    const topTracks = await services.charts.getTopTracks({
                        date: today,
                        period: 'week',
                    });

                    // const topArtists = await cache.get({
                    //     id: `top-artists-week-${today}`,
                    //     date: today,
                    //     period: "week",
                    // });

                    const { value: artistsChartValue, cached } = await server.methods.artists.chart({
                        date: today,
                        period: "week",
                    });

                    const ids = artistsChartValue.items.map((x) => x.spotify_id);

                    const { value: spotifyValue } = await server.methods.spotify.artists({
                        ids,
                    })

                    const topArtists = artistsChartValue.items.map((a) => {
                        const match = spotifyValue.artists.find((s) => s.id === a.spotify_id);

                        return {
                            ...a,
                            images: match ? match.images : [],
                        };
                    });

                    const data = {
                        totals: {
                            bowie,
                            durations,
                            tracks,
                        },
                        topTracks,
                        topArtists: { items: topArtists }
                    };

                    if (request.auth.isAuthenticated) {
                        return h.view('index', {
                            auth: {
                                isAuthenticated: true,
                                name: request.auth.credentials.profile.displayName,
                                username: request.auth.credentials.username,
                            },
                            ...data,
                        });
                    }

                    return h.view('index', {
                        ...data,
                    });
                },
                validate: {
                    query: Joi.object({
                        date: Joi.string().isoDate(),
                    }),
                },
            },
        });
    },
};

module.exports = plugin;
