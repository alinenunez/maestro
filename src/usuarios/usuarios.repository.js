const Usuario = require("../database/models/usuario.model");
const listar = () => Usuario.findAll({ order: [["nome_completo", "ASC"], ["id_usuario", "ASC"]] });
const buscarPorId = id => Usuario.findByPk(id);
const criar = dados => Usuario.create(dados);
async function atualizar(id, dados) {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return null;
    return usuario.update(dados);
}
const listarResponsaveis = () => Usuario.findAll({
    attributes: ["id_usuario", "nome_completo"],
    where: { situacao: true, tipo_acesso: ["administrador", "funcionario"] },
    order: [["nome_completo", "ASC"], ["id_usuario", "ASC"]],
});
module.exports = { listar, buscarPorId, criar, atualizar, listarResponsaveis };
