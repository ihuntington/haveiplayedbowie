import fetch from "node-fetch";

export class Spotify {
    constructor(token, refreshToken) {
        this.accessToken = null;
        this.token = token;
        this.refreshToken = refreshToken;
        this.retryCount = 0;
    }

    get token() {
        return this._token;
    }

    set token(value) {
        this._token = value;
    }

    get refreshToken() {
        return this._refreshToken;
    }

    set refreshToken(value) {
        this._refreshToken = value;
    }

    refreshAccessToken(next) {
        const url = 'https://accounts.spotify.com/api/token';
        const client = `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`;
        const credentials = Buffer.from(client).toString('base64');

        const params = new URLSearchParams();
        params.append("grant_type", "refresh_token");

        const options = {
            method: 'POST',
            headers: {
                Authorization: `Basic ${credentials}`,
            },
            form: params,
        };

        return fetch(url, options)
            .then((response) => JSON.parse(response))
            .then((response) => {

                if (response.refresh_token) {
                    this.refreshToken = response.refresh_token;
                }

                this.token = response.access_token;

                if (next && typeof next == 'function') {
                    this.retryCount += 1;

                    return next();
                }

                return {
                    token: this.token,
                    refreshToken: this.refreshToken,
                };
            });
    }

    authenticateWithClientCredentials() {
        const client = `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`;
        const encodedCredentials = Buffer.from(client).toString('base64');
        console.log(client)
        const params = new URLSearchParams();
        params.append("grant_type", "client_credentials");

        const options = {
            method: "POST",
            headers: {
                Authorization: `Basic ${encodedCredentials}`,
            },
            body: params,
        };

        return fetch("https://accounts.spotify.com/api/token", options)
            .then((response) => response.json())
            .then((response) => {
                this.accessToken = response.access_token;

                return response;
            })
            .catch((err) => {
                console.log(err)
            })
    }

    recentlyPlayed(after) {
        const url = 'https://api.spotify.com/v1/me/player/recently-played';
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
            },
            qs: {
                limit: 50
            }
        };

        if (after) {
            options.qs.after = after;
        }

        return request(url, options)
            .then((response) => JSON.parse(response))
            .then((response) => ({
                data: response,
                tokens: {
                    token: this.token,
                    refreshToken: this.refreshToken,
                },
            }))
            .catch((err) => {
                if (err.statusCode === 401 && this.retryCount === 0) {
                    return this.refreshAccessToken(() => this.recentlyPlayed());
                }

                throw new Error('Unable to fetch recently played tracks');
            });
    }

    getArtists(ids) {
        return fetch(`https://api.spotify.com/v1/artists?ids=${ids}`, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
        }).then((response) => response.json());
    }
}
