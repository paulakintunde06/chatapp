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
    username: {
        type: Sequelize.STRING,
        allowNull: false
    },
    read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        // allowNull: false,
    }
}, {
    tableName: 'chats',
    timestamps: true
});

module.exports = Chat;