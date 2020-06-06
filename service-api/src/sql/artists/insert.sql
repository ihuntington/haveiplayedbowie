INSERT INTO artists(${this:name})
VALUES(${this:list})
RETURNING *
