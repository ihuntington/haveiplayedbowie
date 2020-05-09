SELECT DATE_TRUNC('month', sc.played_at) AS datestamp, COUNT(sc.played_at) as total FROM scrobbles sc
JOIN tracks tr ON tr.id = sc.track_id
JOIN artists_tracks artr ON artr.track_id = tr.id
WHERE artr.artist_id = $(id)
AND sc.played_at BETWEEN $(from) AND $(to)
GROUP BY datestamp
ORDER BY datestamp
LIMIT 10

