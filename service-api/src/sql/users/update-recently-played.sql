UPDATE users
SET recently_played_at = now()
WHERE id = ${uid}
