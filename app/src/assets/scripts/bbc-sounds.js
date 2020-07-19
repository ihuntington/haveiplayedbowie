/**
 * TODO
 *
 * - When pause continue to request latest segments every minute
 * - Store tracks from segments in session storage
 */
(function hipbt_bbc_sounds () {
    const URLS = {
        SEGMENTS: 'https://rms.api.bbc.co.uk/v2/services/bbc_6music/segments/latest',
    };

    class Sounds {
        constructor() {
            console.log('hipbt > init', new Date());

            this.timer = null;
            this._player = this.getEmbeddedPlayers()['smp-wrapper'];
            this.currentTime = this._player.currentTime() * 1000;
            // TODO: if on demand the take first track from preloaded state
            this.currentTrack = null;
            this.seeking = false;

            console.log('> hipbt > isLive', this.isLive);
            console.log('> hipbt > init > current time', this.currentTime);
            this.setup();
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
            console.log('> hipbt > setup');

            const sharedEvents = ['playing', 'pause', 'seeking', 'userPlay'];
            const liveEvents = ['significanttimeupdate'];
            const onDemandEvents = ['continuousPlayChange', 'ended', 'timeupdate'];

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

        addEvent(event) {
            this._player._events[event].push(this.handleEvent.bind(this, event));
        }

        handleEvent(eventName, event) {
            switch (eventName) {
                case 'significanttimeupdate': {
                    this.updateTimings(event);
                    break;
                }

                case 'timeupdate': {
                    const { currentTime } = event;
                    // console.log('> currentTime', currentTime, this.currentTrack)

                    const playingTrack = this.tracklist.filter((track) => {
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
                        console.log('> Seeking, no playing track');
                        this.currentTrack = null;
                        this.seeking = false;
                        return;
                    }

                    if (playingTrack.length > 0 && this.seeking) {
                        // TODO: improve the track selection as track times can overlap
                        this.currentTrack = playingTrack.pop();
                        console.log('> Seeking, current track', this.currentTrack);
                        this.seeking = false;
                        return;
                    }

                    // No playing track and there is a current track then this is finished(?)
                    if (playingTrack.length === 0 && this.currentTrack) {
                        console.log('> No playing track, has current track, send segment', this.currentTrack);
                        this.sendSegment(this.currentTrack);
                        this.currentTrack = null;
                        return;
                    }

                    if (playingTrack.length > 0 && this.currentTrack) {
                        const p = playingTrack.pop();
                        if (p.id !== this.currentTrack.id) {
                            this.sendSegment(this.currentTrack);
                            this.currentTrack = p;
                        }
                        return;
                    }

                    if (playingTrack.length > 0) {
                        this.currentTrack = playingTrack.pop();
                    }

                    this.currentTime = currentTime;

                    return;
                }

                case 'seeking': {
                    console.log('> seeking', event);
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

        getTrackList() {
            const state = this.getPreloadedState();
            const tracks = state && state.tracklist && state.tracklist.tracks || [];
            return tracks;
        };

        updateTimings(event) {
            const eventCurrentTime = event.currentTime * 1000;

            if (eventCurrentTime - this.currentTime >= 60 * 1000) {
                this.currentTime = eventCurrentTime;
                console.log('> hipbt > change in minutes', new Date(this.currentTime));
                this.getLatestSegments();
            }
        }

        getLatestSegments() {
            console.log('> hipbt > getLatestSegments');
            fetch(URLS.SEGMENTS)
                .then((res) => res.json())
                .then((res) => {
                    const tracks = res.data;
                    console.log('> hipbt > getLatestSegments > segments');
                    console.log(tracks);
                });
        };

        sendSegment(segment) {
            console.log('> hipbt > sendSegment', segment);
        }
    }

    // Sounds.prototype.createTimer = function () {
    //     let startTime = Date.now();

    //     const loop = () => {
    //         if (Date.now() - startTime >= 1000) {
    //             startTime = Date.now();
    //             // console.log(new Date(startTime));
    //             this.getPlayerStatus();
    //         }

    //         cancelAnimationFrame(this.timer);
    //         this.timer = requestAnimationFrame(() => loop());
    //     }

    //     loop();
    // };

    window.hipbt = window.hipbt || {};

    if (!window.hipbt.sounds) {
        window.hipbt.sounds = new Sounds();
    }

    window._test=function(){fetch("https://rms.api.bbc.co.uk/v2/services/bbc_6music/segments/latest").then(s=>s.json()).then(s=>{console.log(s)})};
})();
