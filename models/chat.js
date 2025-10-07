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
            model: 'users',
            key: 'id',
        }
    },
    receiver_id:{
        type: Sequelize.INTEGER,
        allowNull: false,
        references:{
            model: 'users',
            key: 'id',
        },
    },
}, {
    tableName: 'chats',
    timestamps: true
});

module.exports = Chat;