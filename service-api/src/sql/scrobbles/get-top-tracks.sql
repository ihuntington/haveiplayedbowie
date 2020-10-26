SELECT tr.id AS track_id, tr.name AS track_name, ar.id AS artist_id, ar.name AS artist_name, COUNT(sc.track_id) AS total FROM scrobbles sc
JOIN tracks tr ON tr.id = sc.track_id
JOIN artists_tracks artr ON artr.track_id = tr.id
JOIN artists ar ON ar.id = artr.artist_id
WHERE sc.played_at BETWEEN $(from) AND $(to)
GROUP BY tr.id, tr.name, ar.id, ar.name
ORDER BY total DESC
LIMIT 10
