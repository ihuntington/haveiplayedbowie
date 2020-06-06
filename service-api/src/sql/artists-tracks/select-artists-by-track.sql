SELECT artist_id, artist_order, a.name AS artist_name, spotify_id
FROM artists_tracks artr
JOIN artists a ON a.id = artr.artist_id
WHERE artr.track_id = ${track_id}
ORDER BY artist_order
