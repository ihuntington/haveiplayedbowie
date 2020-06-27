select datestamp, coalesce(play_count, 0) as total from (
    select datestamp::date from generate_series(timestamp ${from}, timestamp ${to}, interval '1 month') datestamp
) d
left join (
    select date_trunc('month', sc.played_at) as datestamp, count(sc.played_at) as play_count from scrobbles sc
    join tracks tr on tr.id = sc.track_id
    join artists_tracks artr on artr.track_id = tr.id
    where artr.artist_id = ${id}
    and extract('year' from sc.played_at) = ${year}
    group by datestamp
) t using (datestamp)
order by datestamp;
