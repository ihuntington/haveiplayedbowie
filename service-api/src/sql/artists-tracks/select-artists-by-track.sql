SELECT artist_id AS id, artist_order AS order, a.name, a.spotify_id
FROM artists_tracks artr
JOIN artists a ON a.id = artr.artist_id
WHERE artr.track_id = ${track_id}
ORDER BY artist_order
