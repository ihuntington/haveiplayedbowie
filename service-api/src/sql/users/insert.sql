INSERT INTO users(${user:name})
VALUES(${user:list})
RETURNING id, email, profile, username
