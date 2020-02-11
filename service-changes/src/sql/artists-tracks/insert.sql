insert into artists_tracks(artist_id, track_id)
values(${aid}, ${tid})
returning *
