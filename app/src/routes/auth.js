'use strict';

const process = require('process');
const Wreck = require('@hapi/wreck');

async function spotifyAuth(request, h) {
    if (!request.auth.isAuthenticated) {
        return `Authentication failed due to: ${request.auth.error.message}`;
    }

    try {
        const { credentials } = request.auth;

        const response = await Wreck.get(`${process.env.SERVICE_API_URL}/users?email=${credentials.profile.email}`, {
            json: true,
        });

        let user = response.payload;

        // TODO: even if user exists, may want to update profile in case any changes
        if (!user) {
            const profile = {
                displayName: credentials.profile.displayName,
                id: credentials.profile.id,
                username: credentials.profile.username,
            };

            const newUserResponse = await Wreck.post(`${process.env.SERVICE_API_URL}/users`, {
                payload: {
                    email: credentials.profile.email,
                    token: credentials.token,
                    refreshToken: credentials.refreshToken,
                    profile,
                },
                json: true,
            });

            user = newUserResponse.payload;
        }

        request.cookieAuth.set({ id: user.id });

        if (!user.username) {
            return h.redirect('/account/username');
        }

        return h.redirect('/');
    } catch (err) {
        console.log(err);

        return h.redirect('/login');
    }
}

function login(request, h) {
    if (request.auth.isAuthenticated) {
        return h.redirect('/');
    }

    return h.view('login');
}

function logout(request, h) {
    request.cookieAuth.clear();
    return h.redirect('/');
}

module.exports = {
    login,
    logout,
    spotifyAuth,
};
