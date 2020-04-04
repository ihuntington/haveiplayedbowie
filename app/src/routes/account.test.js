'use strict';

const account = require('./account');
const db = require('../db');

jest.mock('../db');

describe('getUsername', () => {
    describe('GIVEN an authenticated user with a username', () => {
        it('should redirect to root', () => {
            const spyRedirect = jest.fn();
            const request = {
                auth: {
                    isAuthenticated: true,
                    credentials: {
                        username: 'example-username',
                    },
                },
            };
            const mockHapi = {
                view: jest.fn(),
                redirect: spyRedirect,
            };

            account.getUsername(request, mockHapi);

            expect(spyRedirect).toHaveBeenCalledWith('/');
        });
    });

    describe('GIVEN an authenticated user without a username', () => {
        it('should render the username view', () => {
            const spyView = jest.fn();
            const request = {
                auth: {
                    isAuthenticated: true,
                    credentials: {
                        username: null,
                    },
                },
            };
            const mockHapi = {
                view: spyView,
            };

            account.getUsername(request, mockHapi);

            expect(spyView).toHaveBeenCalledWith('account/username', { hasNav: false });
        });
    });
});

describe('postUsername', () => {
    describe('GIVEN an authenticated user with a username', () => {
        it('should redirect to root', async () => {
            const spyRedirect = jest.fn();
            const request = {
                auth: {
                    isAuthenticated: true,
                    credentials: {
                        username: 'example-username',
                    },
                },
            };
            const mockHapi = {
                redirect: spyRedirect,
            };

            await account.postUsername(request, mockHapi);

            expect(spyRedirect).toHaveBeenCalledWith('/');
        });
    });

    describe('GIVEN an authenticated user without a username', () => {
        describe('AND the payload username is unique', () => {
            it('should redirect to root', async () => {
                const spyRedirect = jest.fn();
                const request = {
                    auth: {
                        isAuthenticated: true,
                        credentials: {
                            id: '12345',
                            username: null,
                        },
                    },
                    payload: {
                        username: 'unique-username',
                    },
                };
                const mockHapi = {
                    redirect: spyRedirect,
                };

                db.updateUsername.mockResolvedValue();

                await account.postUsername(request, mockHapi);

                expect(spyRedirect).toHaveBeenCalledWith('/');
            });
        });

        describe('AND then payload username is NOT unique', () => {
            it('should return the view with an username error', async () => {
                const spyView = jest.fn();
                const request = {
                    auth: {
                        isAuthenticated: true,
                        credentials: {
                            id: '12345',
                            username: null,
                        },
                    },
                    payload: {
                        username: 'not-unique-username',
                    },
                };
                const mockHapi = {
                    view: spyView,
                };

                // TODO: pass in relevant pgp error
                db.updateUsername.mockRejectedValue();

                await account.postUsername(request, mockHapi);

                expect(spyView).toHaveBeenCalledWith('account/username', {
                    hasNav: false,
                    form: {
                        username: {
                            error: true,
                        },
                    },
                });
            });
        });
    });
});
