UPDATE users
SET recently_played_at = now()
WHERE id = $1
