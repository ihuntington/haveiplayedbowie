SELECT tracks.id AS id, tracks.name AS name, COUNT(scrobbles.track_id) AS total
FROM scrobbles
JOIN tracks ON tracks.id = scrobbles.track_id
$(where:raw)
GROUP BY tracks.id, tracks.name
ORDER BY total DESC
LIMIT $(limit)
