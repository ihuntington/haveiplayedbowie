SELECT s.id, s.played_at, t.id AS track_id, t.name AS track_name, t.duration_ms AS track_duration, t.spotify_id
FROM scrobbles s
JOIN tracks t ON t.id = s.track_id
JOIN artists_tracks artr ON artr.track_id = t.id
WHERE s.user_id = ${uid}
AND CAST(s.played_at AS DATE) = ${date}
ORDER BY s.played_at ASC;
