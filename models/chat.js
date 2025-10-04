const Sequelize = require('sequelize');

const sequelize = require('../util/database');

const Chat = sequelize.define('Chat',{
    message:{
        type: Sequelize.STRING,
        allowNull: false,

    },
    sender_id:{
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id',
        }
    },
    receiver_id:{
        type: Sequelize.INTEGER,
        allowNull: false,
        references:{
            model: 'Users',
            key: 'id',
        },
    },
});

module.exports = Chat;