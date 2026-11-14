const { DataTypes } = require("sequelize");
const connection = require("../connection");
const Usuario = require("./usuario.model");

const Despesa = connection.define("Despesa", {
    id_despesa: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_despesa: { type: DataTypes.STRING(100), allowNull: false },
    valor: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    data_pagamento: { type: DataTypes.DATEONLY, allowNull: false },
    id_usuario: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: "despesa", timestamps: false });

Despesa.belongsTo(Usuario, { foreignKey: "id_usuario", as: "usuario" });

module.exports = Despesa;
