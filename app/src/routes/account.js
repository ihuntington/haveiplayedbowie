'use strict';

const db = require('../db')

function getUsername(request, h) {
    if (
        request.auth.isAuthenticated &&
        request.auth.credentials.username
    ) {
        return h.redirect('/');
    }

    return h.view('account/username', {
        hasNav: false,
    });
}

async function postUsername(request, h) {
    if (
        request.auth.isAuthenticated &&
        request.auth.credentials.username
    ) {
        return h.redirect('/');
    }

    try {
        const uid = request.auth.credentials.id;
        await db.updateUsername(uid, request.payload.username);
        return h.redirect('/');
    } catch (err) {
        console.log(err);
        // TODO check error is instanceof QueryResultError
        return h.view('account/username', {
            hasNav: false,
            hasError: true,
            errors: {
                username: 'unavailable',
            },
        });
    }
}

module.exports = {
    getUsername,
    postUsername,
};
