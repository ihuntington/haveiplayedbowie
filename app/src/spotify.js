const qs = require('querystring');
const axios = require('axios');

class SpotifyClient {
  constructor(credentials) {
    this.credentials = credentials;
  }

  async _makeRequest(config, attempts = 1) {
    try {
      return axios.request(config);
    } catch (requestError) {
      if (attempts === 1) {
        throw requestError;
      }
    }
  }

  async refreshToken() {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
    const buffer = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
    const { refreshToken } = this.credentials;
    const config = {
      method: 'POST',
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        Authorization: `Basic ${buffer.toString('base64')}`
      },
      data: qs.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
    };

    try {
      const request = await this._makeRequest(config);
      return request.data;
    } catch (requestError) {
      console.log(requestError);
      throw `Unable to refresh access token`;
    }
  }

  async getRecentlyPlayed() {
    const config = {
      method: 'GET',
      url: 'https://api.spotify.com/v1/me/player/recently-played',
      headers: {
        'Authorization': `Bearer ${this.credentials.token}`,
      },
      params: {
        limit: 50,
      },
    };

    return await this._makeRequest(config);
  }
}

module.exports = SpotifyClient;
