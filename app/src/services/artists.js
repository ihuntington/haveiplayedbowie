const Wreck = require('@hapi/wreck');

const getArtistById = async (id) => {
    const { SERVICE_API_URL } = process.env;
    try {
        const { payload } = await Wreck.get(`${SERVICE_API_URL}/artists/${id}`, { json: true });
        return payload;
    } catch (err) {
        return null;
    }
};

module.exports = {
    getArtistById,
};
