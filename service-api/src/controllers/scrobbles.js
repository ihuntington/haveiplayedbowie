const { Op } = require('sequelize')

const sequelize = require('../sequelize')
const { Artist, ArtistTrack, Scrobble, Track } = require('../models')

const compare = (a, b) => {
    const sortedA = a.slice().sort();
    const sortedB = b.slice().sort();

    return sortedA.length === sortedB.length && sortedA.every((value, index) => {
        return value === sortedB[index];
    });
};

exports.insertScrobbleFromSpotify = async (uid, item) => {
    const requestArtistNames = item.track.artists.map(({ name }) => name);

    let result = null;

    try {
        result = await sequelize.transaction(async (transaction) => {

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
                        },
                    }
                ]
            });

            const existingTrack = storedTracks.find(({ artists }) => {
                return compare(requestArtistNames, artists.map(({ name })=> name));
            });

            if (existingTrack) {
                const [scrobble] = await Scrobble.findOrCreate({
                    where: {
                        track_id: existingTrack.id,
                        played_at: item.played_at,
                        user_id: uid,
                    },
                    transaction,
                })

                return scrobble;
            }

            const [track] = await Track.findOrCreate({
                where: {
                    name: item.track.name,
                    duration_ms: item.track.duration_ms,
                    spotify_id: item.track.id,
                },
                transaction,
            });

            const artists = await Promise.all(item.track.artists.map(({ name, id }) => {
                return Artist.findOrCreate({
                    where: {
                        name,
                        spotify_id: id,
                    },
                    transaction,
                });
            }));

            // Update junction table
            await ArtistTrack.bulkCreate(
                artists
                    .map(([artist], index) => ({
                        artist_id: artist.id,
                        track_id: track.id,
                        artist_order: index,
                    })),
                {
                    transaction,
                }
            );

            const [scrobble] = await Scrobble.findOrCreate({
                where: {
                    track_id: track.id,
                    played_at: item.played_at,
                    user_id: uid,
                },
                transaction,
            });

            return scrobble;
        });
    } catch (err) {
        console.log(`Insert scrobble transaction failed for user ${uid}`);
        console.error(err);
    }

    if (result) {
        return result.id;
    }

    return result;
}
