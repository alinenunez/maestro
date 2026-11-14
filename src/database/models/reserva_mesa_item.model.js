const { DataTypes } = require("sequelize");
const connection = require("../connection");

module.exports = connection.define("ReservaMesaItem", {
    id_reserva: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    id_mesa: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
}, { tableName: "reserva_mesa_item", timestamps: false });
