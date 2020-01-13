const queries = {
    getArtistById: `
        SELECT id, name FROM artists
        WHERE id = $1
    `,
    getTopTracks: `
        SELECT tr.name AS track_name, ar.name AS artist_name, COUNT(sc.track_id) AS play_count FROM scrobbles sc
        JOIN tracks tr ON tr.id = sc.track_id
        JOIN artists_tracks artr ON artr.track_id = tr.id
        JOIN artists ar ON ar.id = artr.artist_id
        WHERE sc.played_at BETWEEN $(from) and $(to)
        GROUP BY tr.name, ar.name
        ORDER BY play_count DESC
        LIMIT 10
    `,
    getTrack: `
        SELECT tr.id AS track_id, tr.name AS track_name, ar.name AS artist_name, ar.id AS artist_id, tr.duration_ms AS duration FROM tracks tr
        JOIN artists_tracks artr ON artr.track_id = tr.id
        JOIN artists ar ON ar.id = artr.artist_id
        WHERE tr.id = $1
    `,
    getTracksByDate: `
        SELECT tr.id as track_id, tr.name as track_name, ar.id as artist_id, ar.name as artist_name, tr.duration_ms, sc.played_at FROM scrobbles sc
        JOIN tracks tr ON tr.id = sc.track_id
        JOIN artists_tracks art ON art.track_id = tr.id
        JOIN artists ar ON ar.id = art.artist_id
        WHERE CAST(sc.played_at AS DATE) = $1
        ORDER BY sc.played_at
    `,
};

module.exports = queries;
