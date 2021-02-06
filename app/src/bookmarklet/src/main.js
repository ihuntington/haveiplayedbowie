import { Sounds } from './sounds.js'

const MINUTE = 60 * 1000;
const stations = [
    'bbc_radio_two',
    'bbc_6music',
];
const API = {
    schedules: 'https://rms.api.bbc.co.uk/v2/experience/inline/schedules/<service>/<date>',
    segments: 'https://rms.api.bbc.co.uk/v2/services/<station>/segments/latest',
};
const URLS = {
    SEGMENTS: 'https://rms.api.bbc.co.uk/v2/services/bbc_6music/segments/latest',
    // TODO: are on demand programmes containers?
    ON_DEMAND: 'https://www.bbc.co.uk/sounds/play/<container>',
    LIVE: 'https://www.bbc.co.uk/sounds/play/live:<station>',
};

export const tracklist = new Map();

if (
    window.location.origin === 'https://www.bbc.co.uk'
    && !window.hipbt.sounds
) {
    window.hipbt.sounds = new Sounds()
}
