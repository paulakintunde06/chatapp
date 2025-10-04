// const mysql = require('mysql2')

// const pool = mysql.createPool({
//     host: 'localhost',
//     user: 'root',
//     database: 'chatapp',
//     password: ''
// });

// module.exports = pool.promise()

// USING SEQUELIZE

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
        }
    });
} else {
    sequelize = new Sequelize('chatapp', 'root', process.env.DB_PASS || null, {
       dialect: 'mysql',
       host: 'localhost',
       port: 3310,
       logging: false,
    })

}


module.exports = sequelize;