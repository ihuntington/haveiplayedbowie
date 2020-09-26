'use strict'

const { User } = require('../models')

exports.readOne = async (query) => {
    let user = null

    try {
        user = await User.findOne({
            where: {
                ...query,
            },
            attributes: {
                exclude: ['token', 'refresh_token']
            }
        })
    } catch (err) {
        console.error('User.getByUsername', err);
    }

    return user;
}

