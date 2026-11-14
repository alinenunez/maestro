const { DataTypes } = require("sequelize");
const connection = require("../connection");
const Usuario = require("./usuario.model");
const ItemVenda = require("./item_venda.model");

const Venda = connection.define("Venda", {
    id_venda: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    data_hora_venda: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    valor_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    confirmacao_maior_idade: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    id_usuario: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: "venda", timestamps: false });

Venda.belongsTo(Usuario, { foreignKey: "id_usuario", as: "usuario" });
Venda.hasMany(ItemVenda, { foreignKey: "id_venda", as: "itens" });

module.exports = Venda;
