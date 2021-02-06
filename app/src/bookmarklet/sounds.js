import __SNOWPACK_ENV__ from './__snowpack__/env.js';
import.meta.env = __SNOWPACK_ENV__;

/**
 * TODO
 *
 * - When pause continue to request latest segments every minute
 * - Store tracks from segments in session storage
 * - Use a worker for staying synced when tab sleeps
 * - Check for isLive and only run if is on demand -- will break otherwise
 */
(function hipbt_bbc_sounds () {
    const { NODE_ENV, SNOWPACK_PUBLIC_BOWIE_URL, SNOWPACK_PUBLIC_BBC_URL } = import.meta.env;
    const URLS = {
        SEGMENTS: 'https://rms.api.bbc.co.uk/v2/services/bbc_6music/segments/latest',
    };

    class Sounds {
        constructor() {
            this._debug = NODE_ENV !== "production";

            this.log("HIPBT x BBC Sounds start");

            this._player = this.getEmbeddedPlayers()['smp-wrapper'];
            this.currentTime = this._player.currentTime() * 1000;
            // TODO: if on demand the take first track from preloaded state
            this.currentTrack = null;
            this.seeking = false;
            this._iframe = null;
            this._tracklist = this.getTrackList();

            this.errors = [];

            this.createIframe();

            // const programme = this.getProgramme();
            // this.sendMessage({ ...programme, type: 'programme' });
        }

        get isLive() {
            if (!this._player) {
                console.warn('hipbt: player does not exist');
            }

            return this._player.player.sonar.isLive;
        }

        get tracklist() {
            return this.getTrackList();
        }

        setup() {
            this.debug('HIPBT Setup');

            const sharedEvents = ['playing', 'pause', 'seeking', 'userPlay'];
            const liveEvents = ['significantTimeUpdate'];
            const onDemandEvents = ['continuousPlayChange', 'timeupdate'];

            let events = [];

            if (this.isLive) {
                events = events.concat(sharedEvents, liveEvents);
            } else {
                events = events.concat(sharedEvents, onDemandEvents);
            }

            events.forEach((event) => {
                this.addEvent(event);
            });
        };

        log(message) {
            if (!this._debug) {
                return;
            }

            console.log({ date: Date.now(), message });
        }

        debug(message) {
            if (!this._debug) {
                return;
            }

            console.debug({ date: Date.now(), message });
        }

        error(message) {
            if (!this._debug) {
                return;
            }

            console.error({ date: Date.now(), message });
        }

        addEvent(event) {
            if (event === "timeupdate") {
                this._player._events[event].push(this.handleTimeUpdate.bind(this));
            } else {
                this._player._events[event].push(this.handleEvent.bind(this, event));
            }
        }

        handleTimeUpdate(event) {
            const { currentTime } = event;

            this.currentTime = currentTime;

            const playingTrack = this._tracklist.filter((track) => {
                if (!track.offset) {
                    return;
                }

                return currentTime >= track.offset.start && currentTime <= track.offset.end;
            });
            // let track = null;

            // TODO: not perfect... need a proper solution as you could seek into the overlap portion
            // if (playingTrack.length > 0) {
            //     if (currentTime < this.currentTime) {
            //         track = playingTrack.shift();
            //     } else {
            //         track = playingTrack.pop();
            //     }
            // }

            if (playingTrack.length === 0 && this.seeking) {
                this.log('> HIPBT End seeking and no current track');
                this.currentTrack = null;
                this.seeking = false;
                this.sendNowPlaying(null);

                return;
            }

            // TODO: improve the track selection as track times can overlap
            if (playingTrack.length > 0 && this.seeking) {
                this.log('HIPBT End Seeking and current track(s)');
                this.log(playingTrack);
                this.currentTrack = playingTrack.pop();
                this.sendNowPlaying(this.currentTrack);
                this.seeking = false;

                return;
            }

            this.seeking = false;

            // No playing track and there is a current track then this is finished(?)
            if (playingTrack.length === 0 && this.currentTrack) {
                this.log('HIPBT No playing track, send previous current track', this.currentTrack);
                this.sendSegment(this.currentTrack);
                this.sendNowPlaying(null);
                this.currentTrack = null;
                return;
            }

            if (playingTrack.length > 0 && this.currentTrack) {
                // cannot remember what currentTrack means
                this.log("HIPBT Playing track(s) and has current track");
                const newCurrentTrack = playingTrack.pop();

                if (this.errors.length) {
                    const containsCurrentTrack = this.errors.some((e) => e.message.segment.id === newCurrentTrack.id);

                    if (containsCurrentTrack) {
                        this.errors = this.errors.filter((e) => e.message.segment.id !== newCurrentTrack.id);
                        this.sendNowPlaying(newCurrentTrack);
                    }
                }

                this.sendNowPlaying(newCurrentTrack);

                if (newCurrentTrack.id !== this.currentTrack.id) {
                    this.sendNowPlaying(newCurrentTrack);
                    this.sendSegment(this.currentTrack);
                    this.currentTrack = newCurrentTrack;
                }
                return;
            }

            if (playingTrack.length > 0) {
                this.log("> is playing a track")
                const newCurrentTrack = playingTrack.pop();
                this.sendNowPlaying(newCurrentTrack);
                this.currentTrack = newCurrentTrack;
                return;
            }

            if (!playingTrack) {
                this.currentTrack = null;
                this.sendNowPlaying(null);
                return;
            }
        }

        handleEvent(eventName, event) {
            switch (eventName) {
                case 'significanttimeupdate': {
                    this.updateTimings(event);
                    break;
                }

                case 'seeking': {
                    this.log('> seeking', event);
                    this.seeking = true;
                }
            }
        };

        getEmbeddedPlayers() {
            return window.embeddedMedia.api.players();
        };

        getPreloadedState() {
            return window.__PRELOADED_STATE__ || {};
        };

        getProgramme() {
            const state = this.getPreloadedState();

            if (state.programmes && state.programmes.current) {
                return {
                    programme: state.programmes.current.titles.primary,
                    episode: state.programmes.current.titles.secondary,
                };
            }

            return null;
        }

        getTrackList() {
            const state = this.getPreloadedState();
            const tracks = state && state.tracklist && state.tracklist.tracks || [];
            // Note - 31/01/2021 - noticed that sometimes offset is null
            return tracks.filter((track) => !!track.offset);
        };

        updateTimings(event) {
            const eventCurrentTime = event.currentTime * 1000;

            if (eventCurrentTime - this.currentTime >= 60 * 1000) {
                this.currentTime = eventCurrentTime;
                this.log('> hipbt > change in minutes', new Date(this.currentTime));
                this.getLatestSegments();
            }
        }

        getLatestSegments() {
            this.log('> hipbt > getLatestSegments');
            fetch(URLS.SEGMENTS)
                .then((res) => res.json())
                .then((res) => {
                    const tracks = res.data;
                    this.log('> hipbt > getLatestSegments > segments');
                    this.log(tracks);
                });
        };

        sendSegment(segment) {
            this.log('HIPBT Send segment', segment);
            const message = {
                segment,
                // TODO: need to think more carefully about start and end times
                // these need to be explicit and the API accepts these
                // API would not calculate start time... this will be a DB change
                played_at: new Date().toJSON(),
                service: 'BBC',
                type: 'PLAYED',
            };

            this.sendMessage(message);
        }

        sendNowPlaying(segment) {
            this.log('HIPBT Send now playing', segment);

            if (!segment) {
                this.sendMessage({ type: 'NO_CURRENT_TRACK' });
                return this;
            }

            this.sendMessage({
                segment,
                type: 'NOW_PLAYING',
            });

            return this;
        }

        createIframe() {
            this.debug("HIPBT: create iframe");

            if (this._iframe) {
                return this._iframe;
            }

            const frame = document.createElement('iframe');

            frame.id = 'hipbt-save';
            frame.name = 'hipbt-save-frame';
            frame.width = 100;
            frame.height = 100;
            frame.referrerPolicy = 'strict-origin-when-cross-origin';

            frame.onload = () => this.setup();
            frame.onerror = () => {
                this.error("HIPBT Error loading iframe");
                document.removeChild(frame);
            };

            // NOTE: use trailing slash to be able to use relative paths in HTML
            frame.src = `${SNOWPACK_PUBLIC_BOWIE_URL}/bookmarklet/`;
            frame.style.width = "100%";
            frame.style.display = "block";
            frame.style.position = "sticky";
            frame.style.top = "0px";
            frame.style.background = "#eee";
            frame.style.zIndex = "1000";

            this._iframe = frame;

            document.body.insertBefore(frame, document.body.firstChild);

            return this;
        }

        sendMessage(message) {
            if (!this._iframe) {
                this.error('You need to create an iframe before calling send message');
                return;
            }

            this.log('HIPBT > Send Message', message)

            try {
                this._iframe.contentWindow.postMessage(message, SNOWPACK_PUBLIC_BOWIE_URL);
            } catch (err) {
                this.error(err);
                this.errors.push({ error: err.message, message });
            }
        }
    }

    window.__BOWIE__ = window.__BOWIE__ || {};

    if (NODE_ENV === "production" && window.location.origin !== SNOWPACK_PUBLIC_BBC_URL) {
        console.log("Cannot start HIPBT x BBC Sounds as the origin is not %s", SNOWPACK_PUBLIC_BBC_URL);
        return;
    }

    if (!window.__BOWIE__.sounds) {
        window.__BOWIE__.sounds = new Sounds();
    }
})();
