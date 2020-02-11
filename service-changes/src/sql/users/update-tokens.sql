UPDATE users u
SET token = ${token}, refresh_token = ${refreshToken}
WHERE id = ${id}
