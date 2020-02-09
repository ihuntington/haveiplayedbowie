insert into artists(name)
values(${artistName})
returning id as artist_id, name as artist_name
