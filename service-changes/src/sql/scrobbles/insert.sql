insert into scrobbles(track_id, played_at, user_id)
values(${track_id}, ${played_at}, ${user_id})
returning *
