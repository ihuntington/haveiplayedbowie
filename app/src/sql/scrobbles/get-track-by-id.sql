SELECT tr.id AS track_id, tr.name AS track_name, ar.id AS artist_id, ar.name AS artist_name, tr.duration_ms AS duration, COUNT(played_at) AS total FROM scrobbles sc
JOIN tracks tr ON tr.id = sc.track_id
JOIN artists_tracks artr ON artr.track_id = tr.id
JOIN artists ar ON ar.id = artr.artist_id
WHERE tr.id = ${trackId}
GROUP BY tr.id, tr.name, ar.id, ar.name
