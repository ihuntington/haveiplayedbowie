'use strict';

const Process = require('process');
const qs = require('querystring');
const Wreck = require('@hapi/wreck');

class Spotify {
    constructor() {
        this.token = null;
    }

    static extractTrackId = (url) => {
        // positive look behind for /track/ and then base62 string match
        const pattern = /(?<=\/track\/)[a-z0-9]{1,}/gi;
        const match = url.match(pattern);

        if (!match.length) {
            return null;
        }

        return match[0];
    }

    async getAccessToken() {
        try {
            const authEncodedString = Buffer.from(`${Process.env.SPOTIFY_CLIENT_ID}:${Process.env.SPOTIFY_CLIENT_SECRET}`);
            const token = authEncodedString.toString('base64');
            const { payload } = await Wreck.post('https://accounts.spotify.com/api/token', {
                payload: qs.stringify({ grant_type: 'client_credentials' }),
                headers: {
                    'Authorization': `Basic ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                json: true,
            });

            this.token = payload;
        } catch (err) {
            throw new Error("Unable to request access token");
        }
    }

    async getTrackById(id) {
        if (!this.token) {
            await this.getAccessToken();
        }

        try {
            const { payload } = await Wreck.get(`https://api.spotify.com/v1/tracks/${id}`, {
                headers: {
                    'Authorization': `Bearer ${this.token.access_token}`,
                },
                json: true,
            });
            return payload;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async getArtists(ids) {
        if (!this.token) {
            await this.getAccessToken();
        }
        console.log("spotify class get artists", ids)
        try {
            const { payload } = await Wreck.get(`https://api.spotify.com/v1/artists?ids=${ids.join(",")}`, {
                headers: {
                    'Authorization': `Bearer ${this.token.access_token}`,
                },
                json: true,
            });
            return payload;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async getArtist(id) {
        if (!this.token) {
            await this.getAccessToken();
        }

        try {
            const { payload } = await Wreck.get(`https://api.spotify.com/v1/artists/${id}`, {
                headers: {
                    'Authorization': `Bearer ${this.token.access_token}`,
                },
                json: true,
            });
            return payload;
        } catch (err) {
            console.error(err);
            return null;
        }
    }
}

module.exports = Spotify;
