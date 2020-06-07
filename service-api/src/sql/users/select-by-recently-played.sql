SELECT id, token, refresh_token, recently_played_at
FROM users
WHERE recently_played_at < now() - interval '6 minutes'
OR recently_played_at IS NULL;
