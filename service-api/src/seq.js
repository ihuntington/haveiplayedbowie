'use strict';

const { Sequelize, Op } = require('sequelize');

const sequelize = require('./sequelize')

const { Artist, Scrobble, Track, User } = require('./models')

const connect = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected!');

        const track = await Track.findByPk(1, {
            include: Artist,
        });
        console.log(track);

        const user = await User.findOne({
            where: {
                username: 'ian'
            },
        });

        console.log(user.toJSON());

        const scrobbles = await Scrobble.findAll({
            attributes: ['id', 'played_at', 'user_id'],
            where: {
                [Op.and]: [
                    Sequelize.where(
                        Sequelize.cast(Sequelize.col('played_at'), 'date'),
                        '2020-07-21'
                    ),
                    { user_id: '7ecf533d-0f4d-4def-86d6-c58d3258870f' }
                ]
            },
            include: [
                {
                    model: Track,
                    include: {
                        model: Artist,
                        attributes: ['id', 'name']
                    },
                }
            ],
        });

        let t = scrobbles.map(s => s.toJSON());
        console.log(t[0].track.artists[0])

    } catch (e) {
        console.error('Unable to connect')
        console.error(e);
    }
};

(async () => {
    connect();
})();
