'use strict';
const qs = require('querystring');
const axios = require('axios');

class SpotifyClient {
  constructor(credentials) {
    this.credentials = credentials;
  }

  async refreshToken() {
    const clientIdSecret = btoa(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`);
    const config = {
      headers: {
        Authorization: `Basic ${clientIdSecret}`
      }
    };
    const data = qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: this.credentials.refreshToken,
    })

    try {
      const request = axios.post('https://accounts.spotify.com/api/token', data, config);
      return request.data;
    } catch (err) {
      console.log('Unable to refresh token');
      console.log(err);
      return;
    }
  }

  async getRequest(url, config, attempts = 2) {
    try {
      return await axios.get(url, config);
    } catch (err) {
      if (attempts === 1) {
        throw err;
      }
      return this.getRequest(url, config);
    }
  }

  async getRecentlyPlayed() {
    const config = {
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
      },
      params: {
        limit: 50,
      },
    }

    try {
      const request = await axios.get('https://api.spotify.com/v1/me/player/recently-played', config);
      return request.data;
    } catch (err) {
      if ()
      console.log('Unable to get recently played');
      console.log(err);
    }
  }
}
