insert into tracks(name, duration_ms, spotify_id)
values(${trackName}, ${duration_ms}, ${spotify_id})
returning id as track_id, name as track_name, duration_ms, spotify_id
