update users
set recently_played_at = ${now}
where id = ${user_id}
