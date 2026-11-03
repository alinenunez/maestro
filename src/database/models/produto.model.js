const { DataTypes } = require("sequelize");
const connection = require("../connection");
module.exports = connection.define("Produto", {
    id_produto: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_produto: { type: DataTypes.STRING(100), allowNull: false },
    nome_produto: { type: DataTypes.STRING(150), allowNull: false },
    quantidade_produto: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    valor_unitario: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, { tableName: "produtos", timestamps: false });
