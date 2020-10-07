SELECT id, token, refresh_token
FROM users
WHERE recently_played_at < now() - interval '6 minutes'
OR recently_played_at IS NULL;
