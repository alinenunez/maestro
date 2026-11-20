const { Op, fn, col, where } = require("sequelize");
const Usuario = require("../database/models/usuario.model");

// O hash fica restrito a autenticacao, validacao de sessoes e recuperacao de senha.
function buscarCredenciaisPorEmail(email) {
    return Usuario.unscoped().findOne({
        attributes: ["id_usuario", "nome_completo", "email", "tipo_acesso", "situacao", "senha_hash"],
        where: where(fn("lower", col("email")), email),
    });
}

function buscarUsuarioAtivoPorId(id) {
    return Usuario.unscoped().findOne({
        attributes: ["id_usuario", "nome_completo", "email", "tipo_acesso", "situacao", "senha_hash"],
        where: {
            id_usuario: id,
            situacao: true,
            tipo_acesso: { [Op.in]: ["administrador", "funcionario"] },
        },
    });
}

function criarAdministrador(dados) {
    return Usuario.create(dados);
}

async function atualizarSenhaPorRecuperacao(usuario, senhaHash) {
    const [alterados] = await Usuario.unscoped().update({ senha_hash: senhaHash }, {
        where: {
            id_usuario: usuario.id_usuario,
            senha_hash: usuario.senha_hash,
            email: usuario.email,
            situacao: true,
            tipo_acesso: { [Op.in]: ["administrador", "funcionario"] },
        },
    });
    return alterados === 1;
}

module.exports = { buscarCredenciaisPorEmail, buscarUsuarioAtivoPorId, criarAdministrador, atualizarSenhaPorRecuperacao };
