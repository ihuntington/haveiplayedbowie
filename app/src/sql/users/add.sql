insert into users(email, profile, token, refresh_token)
values(${email}, ${profile}, ${token}, ${refreshToken})
returning id, email, profile
