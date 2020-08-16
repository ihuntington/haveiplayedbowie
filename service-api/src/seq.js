'use strict';

const { Sequelize, DataTypes, Op } = require('sequelize');

const sequelize = new Sequelize(process.env.SQL_DB);

const Track = sequelize.define('track', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    duration_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    spotify_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    timestamps: false,
    underscored: true,
});

const Artist = sequelize.define('artist', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    spotify_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    timestamps: false,
    underscored: true,
});

const ArtistTrack = sequelize.define('artists_tracks', {
    artist_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Artist,
            key: 'id',
        },
    },
    track_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Track,
            key: 'id',
        },
    },
    artist_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    }
}, {
    timestamps: false,
    underscored: true,
    tableName: 'artists_tracks'
});

const User = sequelize.define('user', {
    id: {
        type: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    token: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    refresh_token: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING,
        validate: {
            max: 254,
        },
        allowNull: false,
        unique: true,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW,
    },
    modified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW,
    },
    profile: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    recently_played_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            max: 50,
            min: 2,
        },
        unique: true,
    },
    timezone: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Europe/London',
    },
}, {
    timestamps: false,
    underscored: true,
});

const Scrobble = sequelize.define('scrobble', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    track_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    played_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    timestamps: false,
    underscored: true,
});


Artist.belongsToMany(Track, { through: ArtistTrack, foreignKey: 'artist_id' });
Track.belongsToMany(Artist, { through: ArtistTrack, foreignKey: 'track_id' });
Track.hasMany(Scrobble, { foreignKey: 'track_id'});
Scrobble.belongsTo(Track, { foreignKey: 'track_id' });
User.hasMany(Scrobble, { foreignKey: 'user_id' });
Scrobble.belongsTo(User, { foreignKey: 'user_id' });

// const sequelize = new Sequelize(process.env.SQL_DB, process.env.SQL_USER, process.env.SQL_PASSWORD, {
//     host: 'localhost',
//     dialect: 'postgres',
// });

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

        console.log(JSON.stringify(scrobbles));

    } catch (e) {
        console.error('Unable to connect')
        console.error(e);
    }
};

(async () => {
    connect();
})();
