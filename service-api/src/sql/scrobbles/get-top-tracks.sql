SELECT tr.id, tr.name, COUNT(sc.track_id) AS total
FROM scrobbles sc
JOIN tracks tr ON tr.id = sc.track_id
WHERE sc.played_at BETWEEN $(from) AND $(to)
GROUP BY tr.id, tr.name
ORDER BY total DESC
LIMIT 10
