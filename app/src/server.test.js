'use strict';

const { init } = require('./server');

describe.skip('GET /account/username', () => {
    let server;

    beforeEach(async () => {
        server = await init();
    });

    afterEach(async () => {
        await server.stop();
    });

    it('responds with 200', async () => {
        const res = await server.inject({
            method: 'get',
            url: '/account/username',
            auth: {
                strategy: 'session',
                credentials: {
                    profile: {
                        email: 'user@example.org',
                        id: 'spotify-id',
                        username: 'spotify-usename',
                    },
                    token: 'example-access-token',
                    refreshToken: 'example-refresh-token',
                },
            },
        });
        expect(res.statusCode).toEqual(200);
    });

    describe('AND not authenticated', () => {
        it('response with 302', async () => {
            const res = await server.inject({
                method: 'get',
                url: '/account/username',
            });
            expect(res.statusCode).toEqual(302);
        });
    });
});

describe('POST /temp', () => {
    let server;

    beforeEach(async () => {
       server = await init();
    });

    afterEach(async () => {
        await server.stop();
    });

    // TODO
    // describe('authenticated with username', () => {
    //     it('redirects to /');
    // });
});
