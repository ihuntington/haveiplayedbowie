UPDATE users
SET token = ${token}, refresh_token = ${refresh_token}
WHERE id = ${uid}
