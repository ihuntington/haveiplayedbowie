INSERT INTO scrobbles(track_id, played_at, user_id, source_service)
VALUES(${track_id}, ${played_at}, ${user_id}, ${source_service})
RETURNING *
