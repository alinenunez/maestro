const Usuario = require("../database/models/usuario.model");
const listar = () => Usuario.findAll({ order: [["nome_completo", "ASC"], ["id_usuario", "ASC"]] });
const buscarPorId = id => Usuario.findByPk(id);
const criar = dados => Usuario.create(dados);
async function atualizar(id, dados) {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return null;
    return usuario.update(dados);
}
module.exports = { listar, buscarPorId, criar, atualizar };
