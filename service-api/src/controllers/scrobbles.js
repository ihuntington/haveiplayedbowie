const { Op } = require('sequelize')

const sequelize = require('../sequelize')
const { Artist, ArtistTrack, Scrobble, Track } = require('../models')

const compare = (a, b) => {
    const sortedA = a.slice().sort();
    const sortedB = b.slice().sort();

    return sortedA.length === sortedB.length && sortedA.every((value, index) => {
        return value === sortedB[index];
    });
}

exports.insertScrobbleFromSpotify = async (uid, item) => {
    try {
        const result = await sequelize.transaction(async (t) => {
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
                        },
                    }
                ]
            });

            const match = storedTracks.find(({ artists }) => {
                return compare(requestArtistNames, artists.map(({ name })=> name));
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
                const [track] = await Track.findOrCreate({
                    where: {
                        name: item.track.name,
                        duration_ms: item.track.duration_ms,
                        spotify_id: item.track.id,
                    },
                    transaction: t,
                });

                const artists = await Promise.all(item.track.artists.map(({ name, id }) => {
                    return Artist.findOrCreate({
                        where: {
                            name,
                            spotify_id: id,
                        },
                        transaction: t,
                    });
                }));

                const artistsTracks = await ArtistTrack.bulkCreate(
                    artists
                        .map(([artist], index) => ({
                            artist_id: artist.id,
                            track_id: track.id,
                            artist_order: index,
                        })),
                    {
                        transaction: t,
                    }
                );

                const [record, isNewScrobble] = await Scrobble.findOrCreate({
                    where: {
                        track_id: track.id,
                        played_at: item.played_at,
                        user_id: uid,
                    },
                    transaction: t,
                });

                console.log('>>> isNewScrobble', isNewScrobble);

                scrobble = record;
            }

            return scrobble;
        })

        return result;
    } catch (err) {
        console.log('Insert scrobble transaction failed');
        console.error(err);
    }
}
