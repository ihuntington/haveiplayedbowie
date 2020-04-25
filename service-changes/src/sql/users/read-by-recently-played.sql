SELECT id, token, refresh_token, recently_played_at FROM users
WHERE recently_played_at < now() - interval ${frequency}
OR recently_played_at IS NULL;
