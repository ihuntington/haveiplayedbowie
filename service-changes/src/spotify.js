'use strict';

const request = require('request-promise-native');

class Spotify {
    constructor(token, refreshToken) {
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
        const options = {
            method: 'POST',
            headers: {
                Authorization: `Basic ${credentials}`,
            },
            form: {
                grant_type: 'refresh_token',
                refresh_token: this.refreshToken,
            },
        };

        return request(url, options)
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
}

module.exports = Spotify;
