SELECT tr.id AS track_id, tr.name AS track_name, COUNT(sc.track_id) AS total FROM scrobbles sc
JOIN tracks tr ON tr.id = sc.track_id
JOIN artists_tracks artr ON artr.track_id = tr.id
JOIN artists ar ON ar.id = artr.artist_id
WHERE ar.id = $(id)
AND sc.played_at BETWEEN $(from) AND $(to)
GROUP BY tr.id, tr.name
ORDER BY total DESC
LIMIT 10
