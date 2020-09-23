'use strict';

const process = require('process');
const Wreck = require('@hapi/wreck');

async function spotifyAuth(request, h) {
    if (!request.auth.isAuthenticated) {
        return `Authentication failed due to: ${request.auth.error.message}`;
    }

    const { credentials } = request.auth;
    let user = null;

    try {
        const { payload } = await Wreck.get(`${process.env.SERVICE_API_URL}/users?email=${credentials.profile.email}`, {
            json: true,
        });

        user = payload;
    } catch (err) {
        if (err.data.payload.statusCode === 400) {
            console.log('/auth could not match email address with existing user');
        } else {
            // TODO: server error
            console.error(err);
            return h.redirect('/');
        }
    }

    if (!user) {
        try {
            // TODO: even if user exists, may want to update profile in case any changes
            const profile = {
                displayName: credentials.profile.displayName,
                id: credentials.profile.id,
                username: credentials.profile.username,
            };
            const { payload } = await Wreck.post(`${process.env.SERVICE_API_URL}/users`, {
                payload: {
                    email: credentials.profile.email,
                    token: credentials.token,
                    refreshToken: credentials.refreshToken,
                    profile,
                },
                json: true,
            });

            user = payload;
        } catch (err) {
            // TODO: Unable to create user
            console.log('/auth could not create new user');
            console.error(err);
            h.redirect('/login');
        }
    }

    request.cookieAuth.set({ id: user.id });

    if (!user.username) {
        return h.redirect('/account/username');
    }

    return h.redirect('/');
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
