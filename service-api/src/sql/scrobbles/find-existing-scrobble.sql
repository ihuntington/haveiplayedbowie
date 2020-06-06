SELECT *
FROM scrobbles
WHERE track_id = ${track_id}
AND played_at = ${played_at}
AND user_id = ${user_id}
