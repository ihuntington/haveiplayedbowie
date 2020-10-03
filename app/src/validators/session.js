'use strict';

const process = require('process');
const Wreck = require('@hapi/wreck');

async function sessionValidator (request, session) {
    try {
        const { payload } = await Wreck.get(`${process.env.SERVICE_API_URL}/users/${session.id}`, {
            json: true,
        });

        if (!payload) {
            return { valid: false };
        }

        return {
            valid: true,
            credentials: { ...payload },
        };
    } catch (err) {
        console.log('Session cookie validate error');
        console.error(err.stack);
        return { valid: false };
    }
}

module.exports = {
    sessionValidator,
};
