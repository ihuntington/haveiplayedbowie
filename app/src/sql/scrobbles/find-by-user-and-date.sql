SELECT s.id AS id, s.played_at AS played_at, t.id AS track_id, t.name AS track_name, t.duration_ms AS track_duration, a.id AS artist_id, a.name AS artist_name FROM scrobbles s
JOIN tracks t ON t.id = s.track_id
JOIN artists_tracks artr ON artr.track_id = t.id
JOIN artists a ON a.id = artr.artist_id
WHERE s.user_id = ${uid}
AND CAST(s.played_at AS DATE) = ${date}
ORDER BY s.played_at ASC;
