SELECT artists.id AS id, artists.name AS name, artists.spotify_id AS spotify_id, COUNT(scrobbles.track_id) AS total
FROM scrobbles
JOIN tracks ON tracks.id = scrobbles.track_id
JOIN artists_tracks ON artists_tracks.track_id = tracks.id
JOIN artists ON artists.id = artists_tracks.artist_id
JOIN users ON users.id = scrobbles.user_id
$(where:raw)
GROUP BY artists.id, artists.name
ORDER BY total DESC
LIMIT $(limit)
