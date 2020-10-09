SELECT artist_id AS id, artist_order AS order, name, spotify_id
FROM artists_tracks artr
JOIN artists ON id = artr.artist_id
WHERE artr.track_id = $1
ORDER BY artist_order
