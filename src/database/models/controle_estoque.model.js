const { DataTypes } = require("sequelize");
const connection = require("../connection");
const Produto = require("./produto.model");

const ControleEstoque = connection.define("ControleEstoque", {
    id_estoque: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    data_compra: { type: DataTypes.DATEONLY, allowNull: false },
    quantidade_adquirida: { type: DataTypes.INTEGER, allowNull: false },
    valor_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    id_produto: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: "controle_estoque", timestamps: false });

ControleEstoque.belongsTo(Produto, { foreignKey: "id_produto", as: "produto" });

module.exports = ControleEstoque;
