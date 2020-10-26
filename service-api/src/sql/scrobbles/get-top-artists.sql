SELECT ar.id AS id, ar.name AS name, COUNT(sc.track_id) AS total
FROM scrobbles sc
JOIN tracks tr ON tr.id = sc.track_id
JOIN artists_tracks artr ON artr.track_id = tr.id
JOIN artists ar ON ar.id = artr.artist_id
WHERE sc.played_at BETWEEN $(from) AND $(to)
GROUP BY ar.id, ar.name
ORDER BY total DESC
LIMIT 10
