const queries = {
    getArtistById: `
        SELECT id, name FROM artists
        WHERE id = $1
    `,
    getTopArtists: `
        SELECT ar.id AS artist_id, ar.name AS artist_name, COUNT(sc.track_id) AS total FROM scrobbles sc
        JOIN tracks tr ON tr.id = sc.track_id
        JOIN artists_tracks artr ON artr.track_id = tr.id
        JOIN artists ar ON ar.id = artr.artist_id
        WHERE sc.played_at BETWEEN $(from) and $(to)
        GROUP BY ar.id, ar.name
        ORDER BY total DESC
        LIMIT 10
    `,
    getTopTracks: `
        SELECT tr.id AS track_id, tr.name AS track_name, ar.id AS artist_id, ar.name AS artist_name, COUNT(sc.track_id) AS total FROM scrobbles sc
        JOIN tracks tr ON tr.id = sc.track_id
        JOIN artists_tracks artr ON artr.track_id = tr.id
        JOIN artists ar ON ar.id = artr.artist_id
        WHERE sc.played_at BETWEEN $(from) AND $(to)
        GROUP BY tr.id, tr.name, ar.id, ar.name
        ORDER BY total DESC
        LIMIT 10
    `,
    getTopTracksByArtist: `
        SELECT tr.id AS track_id, tr.name AS track_name, COUNT(sc.track_id) AS total FROM scrobbles sc
        JOIN tracks tr ON tr.id = sc.track_id
        JOIN artists_tracks artr ON artr.track_id = tr.id
        JOIN artists ar ON ar.id = artr.artist_id
        WHERE ar.id = $(artist)
        AND sc.played_at BETWEEN $(from) AND $(to)
        GROUP BY tr.id, tr.name
        ORDER BY total DESC
        LIMIT 10
    `,
    getTotalTracksByArtist: `
        SELECT ar.id AS artist_id, ar.name AS artist_name, COUNT(sc.track_id) AS total FROM scrobbles sc
        JOIN tracks tr ON tr.id = sc.track_id
        JOIN artists_tracks artr ON artr.track_id = tr.id
        JOIN artists ar ON ar.id = artr.artist_id
        WHERE ar.id = $(artist)
        AND sc.played_at BETWEEN $(from) AND $(to)
        GROUP BY ar.id, ar.name
    `,
    getTrack: `
        SELECT tr.id AS track_id, tr.name AS track_name, ar.id AS artist_id, ar.name AS artist_name, tr.duration_ms AS duration, COUNT(played_at) AS total FROM scrobbles sc
        JOIN tracks tr ON tr.id = sc.track_id
        JOIN artists_tracks artr ON artr.track_id = tr.id
        JOIN artists ar ON ar.id = artr.artist_id
        WHERE tr.id = $1
        GROUP BY tr.id, tr.name, ar.id, ar.name
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
