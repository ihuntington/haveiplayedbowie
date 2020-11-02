SELECT artists.id AS id, artists.name AS name, COUNT(scrobbles.track_id) AS total
FROM scrobbles
JOIN tracks ON tracks.id = scrobbles.track_id
JOIN artists_tracks ON artists_tracks.track_id = tracks.id
JOIN artists ON artists.id = artists_tracks.artist_id
$(where:raw)
GROUP BY artists.id, artists.name
ORDER BY total DESC
LIMIT $(limit)
