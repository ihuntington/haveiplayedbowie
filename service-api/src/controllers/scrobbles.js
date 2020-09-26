const { Op } = require('sequelize')
const { equals } = require('rambda')

const sequelize = require('../sequelize')
const { Artist, Scrobble, Track } = require('../models')

exports.insertScrobbleFromSpotify = async (uid, item) => {
    try {
        const result = await sequelize.transaction(async (t) => {
            let track;
            let artists;
            let scrobble;

            const requestArtistNames = item.track.artists.map(({ name }) => name);

            // Find all tracks with the track name and artists
            const storedTracks = await Track.findAll({
                where: {
                    name: item.track.name,
                },
                include: [
                    {
                        model: Artist,
                        where: {
                            name: {
                                [Op.in]: requestArtistNames,
                            }
                        }
                    }
                ]
            });

            const match = storedTracks.find(({ artists }) => {
                const names = artists.sort((a, b) => {
                    return a.artists_tracks.artist_order - b.artists_tracks.artist_order;
                }).map(({ name }) => name);

                return equals(requestArtistNames, names)
            });

            if (match) {
                console.log('>>> has match and adding scrobble')
                const [record] = await Scrobble.findOrCreate({
                    where: {
                        track_id: match.id,
                        played_at: item.played_at,
                        user_id: uid,
                    },
                    transaction: t,
                })

                scrobble = record;
            } else {
                const [track, isNewTrack] = Track.findOrCreate({
                    where: {
                        name: item.track.name,
                        duration_ms: item.track.duration_ms,
                        spotify_id: item.track.id,
                    },
                    transaction: t,
                });
            }

            return scrobble;
        })

        return result;
    } catch (err) {
        console.log('Insert scrobble transaction failed');
        console.error(err);
    }
}
