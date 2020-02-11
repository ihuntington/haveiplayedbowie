select * from scrobbles s
where s.track_id = ${track_id}
and s.played_at = ${played_at}
and s.user_id = ${user_id}
