// const mysql = require('mysql2')

// const pool = mysql.createPool({
//     host: 'localhost',
//     user: 'root',
//     database: 'chatapp',
//     password: ''
// });

// module.exports = pool.promise()

// USING SEQUELIZE
require('dotenv').config()
const Sequelize = require("sequelize");
let sequelize
if (process.env.NODE_ENV === "production") {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: "postgres",
        protocol: "postgres",
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        // logging: console.log,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
} else {
    sequelize = new Sequelize('chatapp', 'root', "" || null, {
       dialect: 'mysql',
       host: 'localhost',
       port: 3310,
    //    logging: console.log,
    })

}

sequelize.authenticate()
    .then(() => console.log('Database connected successfully to:', sequelize.getDatabaseName()))
.catch(err=> console.error('Database connection failed:', err))


module.exports = sequelize;