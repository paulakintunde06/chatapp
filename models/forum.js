const Sequelize = require('sequelize');

const sequelize = require('../util/database');

const Forum = sequelize.define('Forum',{
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
}, {
    tableName: 'forums',
    timestamps: true
});

module.exports = Forum;