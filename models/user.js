const {Sequelize, DataTypes} = require('sequelize');

const sequelize = require('../util/database');

const User = sequelize.define('users', {
    // id: {
    //     type: Sequelize.INTEGER,
    //     autoincrement: true,
    //     allowNull: false,
    //     primaryKey: true,
    // },
    username:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    password:{
        type: Sequelize.STRING,
        allowNull: false,
    }
}, {
    tableName: 'users',
    timestamps: true
});

module.exports = User;


