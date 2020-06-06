INSERT INTO scrobbles(track_id, played_at, user_id)
VALUES(${track_id}, ${played_at}, ${user_id})
RETURNING *
