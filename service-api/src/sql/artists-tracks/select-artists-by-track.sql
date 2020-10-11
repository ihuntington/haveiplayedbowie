SELECT artr.artist_id AS id, artr.artist_order AS order, a.name, a.spotify_id
FROM artists_tracks artr
JOIN artists a ON id = artr.artist_id
WHERE artr.track_id = $1
ORDER BY artr.artist_order
