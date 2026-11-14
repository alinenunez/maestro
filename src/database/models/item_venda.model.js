const { DataTypes } = require("sequelize");
const connection = require("../connection");
const Produto = require("./produto.model");

const ItemVenda = connection.define("ItemVenda", {
    id_venda: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    id_produto: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    quantidade: { type: DataTypes.INTEGER, allowNull: false },
    valor_unitario: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, { tableName: "item_venda", timestamps: false });

ItemVenda.belongsTo(Produto, { foreignKey: "id_produto", as: "produto" });

module.exports = ItemVenda;
