'use strict';

const process = require('process');
const Wreck = require('@hapi/wreck');

function getUsername(request, h) {
    if (request.auth.credentials.username) {
        return h.redirect('/');
    }

    return h.view('account/username', {
        hasNav: false,
    });
}

async function postUsername(request, h) {
    if (request.auth.credentials.username) {
        return h.redirect('/');
    }

    try {
        const uid = request.auth.credentials.id;

        await Wreck.patch(`${process.env.SERVICE_API_URL}/users/${uid}`, {
            payload: {
                ...request.payload,
            },
        });

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
