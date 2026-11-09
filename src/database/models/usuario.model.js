const { DataTypes } = require("sequelize");
const connection = require("../connection");
module.exports = connection.define("Usuario", {
    id_usuario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome_completo: { type: DataTypes.STRING(150), allowNull: false },
    cpf: { type: DataTypes.STRING(11), allowNull: false, unique: true },
    situacao: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    data_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    tipo_contratacao: { type: DataTypes.STRING(50), allowNull: false },
    tipo_acesso: { type: DataTypes.STRING(50), allowNull: false },
    senha_hash: { type: DataTypes.TEXT, allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false },
    data_nascimento: { type: DataTypes.DATEONLY, allowNull: false },
}, {
    tableName: "usuario",
    timestamps: false,
    defaultScope: { attributes: { exclude: ["senha_hash"] } },
});
