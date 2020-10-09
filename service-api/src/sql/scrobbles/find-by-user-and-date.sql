SELECT scrobbles.id, scrobbles.played_at, track.id AS "track.id", track.name AS "track.name", track.spotify_id AS "track.spotify_id", track.duration_ms AS "track.duration_ms"
FROM scrobbles
JOIN tracks track ON track.id = scrobbles.track_id
$1:raw
ORDER BY scrobbles.played_at ASC;
