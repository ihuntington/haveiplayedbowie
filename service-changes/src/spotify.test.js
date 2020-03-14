const request = require('request-promise-native');
const Spotify = require('./spotify');

jest.mock('request-promise-native');

describe('GIVEN a Spotify instance', () => {
    let spotify;

    beforeEach(() => {
        spotify = new Spotify('example-token', 'example-refresh-token');
    });

    afterEach(() => {
        spotify = null;
    });

    it('should be an instanceof Spotify', () => {
        expect(spotify).toBeInstanceOf(Spotify);
    });

    describe('WHEN recentlyPlayed method is successfully called', () => {
        it('should return the token and refreshToken', async () => {
            const stub = { tracks: [] };
            const response = JSON.stringify(stub);
            request.mockResolvedValue(response);

            const result = await spotify.recentlyPlayed();

            expect(result.tokens).toStrictEqual({
                token: 'example-token',
                refreshToken: 'example-refresh-token',
            });
        });

        it('should return recently played tracks', async () => {
            const stub = { tracks: [] };
            const response = JSON.stringify(stub);
            request.mockResolvedValue(response);

            const result = await spotify.recentlyPlayed();

            expect(result.data.tracks).toHaveLength(0);
            expect(result.data).toStrictEqual({
                tracks: [],
            });
        });
    });

    describe('WHEN the access token has expired', () => {
        it('should refresh the access token', async () => {
            const spy = jest.spyOn(spotify, 'refreshAccessToken');

            // Spotify returns 401 unauthorised error
            request.mockRejectedValueOnce({ statusCode: 401 });
            // Successful refresh request
            request.mockResolvedValueOnce(JSON.stringify({
                refresh_token: 'example-refresh-token',
                access_token: 'new-access-token',
            }));
            // Successful call for recently played tracks
            request.mockResolvedValueOnce(JSON.stringify({ test: 'value '}));

            await spotify.recentlyPlayed();

            expect(spy).toHaveBeenCalled();
        });

        describe('AND refreshing the access token fails', () => {
            it('should throw an error', async () => {
                request.mockRejectedValueOnce({ statusCode: 401 });
                spotify.retryCount = 1;
                // TODO: this is __not__ the way to test a thrown error
                // I could not get it to work following Jest docs
                try {
                    await spotify.recentlyPlayed();
                } catch (err) {
                    expect(err.message).toEqual('Unable to fetch recently played tracks');
                }
            });
        });
    });

    describe('WHEN refreshAccessToken method is successfully called', () => {
        it('should return a new access token', async () => {
            const stub = {
                access_token: 'new-access-token',
                refresh_token: 'existing-access-token',
            };
            const response = JSON.stringify(stub);
            request.mockResolvedValue(response);

            const result = await spotify.refreshAccessToken();

            expect(result).toStrictEqual({
                token: 'new-access-token',
                refreshToken: 'existing-access-token',
            });
        });

        describe('AND a new refresh token is granted', () => {
            it('should return new access and refresh tokens', async () => {
                const stub = {
                    access_token: 'new-access-token',
                    refresh_token: 'new-refresh-token',
                };
                const response = JSON.stringify(stub);
                request.mockResolvedValue(response);

                const result = await spotify.refreshAccessToken();

                expect(result).toStrictEqual({
                    token: 'new-access-token',
                    refreshToken: 'new-refresh-token',
                });
            });
        });

        describe('AND a callback function is supplied', () => {
            beforeEach(() => {
                const stub = {
                    access_token: 'new-access-token',
                    refresh_token: 'existing-access-token',
                };
                const response = JSON.stringify(stub);
                request.mockResolvedValue(response);
            });

            it('should increase the retry count', async () => {
                await spotify.refreshAccessToken(jest.fn());
                expect(spotify.retryCount).toEqual(1);
            });

            it('should call the callback function', async () => {
                const mockFn = jest.fn();
                await spotify.refreshAccessToken(mockFn);
                expect(mockFn).toHaveBeenCalled();
            });
        });
    });
});
