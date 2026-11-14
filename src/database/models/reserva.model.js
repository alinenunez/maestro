const { DataTypes } = require("sequelize");
const connection = require("../connection");
const Mesa = require("./mesa.model");
const ReservaMesaItem = require("./reserva_mesa_item.model");

const Reserva = connection.define("ReservaMesa", {
    id_reserva: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome_cliente: { type: DataTypes.STRING(150), allowNull: false },
    telefone_cliente: { type: DataTypes.STRING(20), allowNull: false },
    data_horario_reserva: { type: DataTypes.DATE, allowNull: false },
    duracao_minutos: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: "reserva_mesa", timestamps: false });

Reserva.belongsToMany(Mesa, {
    through: ReservaMesaItem,
    foreignKey: "id_reserva",
    otherKey: "id_mesa",
    as: "mesas",
});

module.exports = Reserva;
