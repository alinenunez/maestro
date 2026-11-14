const { Op, fn, col, where } = require("sequelize");
const Usuario = require("../database/models/usuario.model");
const connection = require("../database/connection");

// O hash e consultado somente para conferir a senha no login.
function buscarCredenciaisPorEmail(email) {
    return Usuario.unscoped().findOne({
        attributes: ["id_usuario", "nome_completo", "email", "tipo_acesso", "situacao", "senha_hash"],
        where: where(fn("lower", col("email")), email),
    });
}

function buscarUsuarioAtivoPorId(id) {
    return Usuario.findOne({
        attributes: ["id_usuario", "nome_completo", "email", "tipo_acesso", "situacao"],
        where: {
            id_usuario: id,
            situacao: true,
            tipo_acesso: { [Op.in]: ["administrador", "funcionario"] },
        },
    });
}

async function criarAdministradorInicial(dados) {
    return connection.transaction(async transaction => {
        // Impede que dois cadastros iniciais passem juntos pela verificacao.
        // Nao altera a estrutura nem os registros existentes.
        await connection.query('LOCK TABLE "usuario" IN SHARE ROW EXCLUSIVE MODE', { transaction });
        const existente = await Usuario.findOne({
            attributes: ["id_usuario"],
            where: { tipo_acesso: "administrador" },
            transaction,
        });
        if (existente) return null;
        return Usuario.create(dados, { transaction });
    });
}

module.exports = { buscarCredenciaisPorEmail, buscarUsuarioAtivoPorId, criarAdministradorInicial };
