const { DataTypes } = require("sequelize");
const connection = require("../connection");
module.exports = connection.define("Mesa", {
    id_mesa: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    numero_mesa: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "disponivel" },
}, { tableName: "mesa_sinuca", timestamps: false });
