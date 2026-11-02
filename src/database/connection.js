const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../../.env"), quiet: true });
const { Sequelize } = require("sequelize");

const connection = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5432),
        dialect: "postgres",
        logging: false,
        dialectOptions: { connectionTimeoutMillis: 5000 },
        pool: { max: 5, min: 0, acquire: 10000, idle: 10000 },
        define: { timestamps: false, freezeTableName: true },
    },
);

module.exports = connection;
