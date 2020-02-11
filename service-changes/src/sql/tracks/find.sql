select t.id as track_id, t.name as track_name, a.id as artist_name, a.name as artist_name from tracks t
join artists_tracks artr on artr.track_id = t.id
join artists a on a.id = artr.artist_id
where t.name = ${trackName}
and a.name = ${artistName}
