'use strict';

const db = require('../db');

async function spotifyAuth(request, h) {
    if (!request.auth.isAuthenticated) {
        return `Authentication failed due to: ${request.auth.error.message}`;
    }

    try {
        const { credentials } = request.auth;

        let user = await db.getUserByEmail(credentials.profile.email);
        // TODO: even if user exists, may want to update profile in case any changes
        if (!user) {
            const profile = {
                displayName: credentials.profile.displayName,
                id: credentials.profile.id,
                username: credentials.profile.username,
            };

            user = await db.addUser({
                email: credentials.profile.email,
                token: credentials.token,
                refreshToken: credentials.refreshToken,
                profile: JSON.stringify(profile),
            });
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
