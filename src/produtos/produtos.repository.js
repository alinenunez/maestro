const Produto = require("../database/models/produto.model");
const { Op } = require("sequelize");

function listar({ nome, tipo } = {}) {
    const where = {};
    if (nome) {
        // Trata %, _ e barra invertida como texto, nao como curingas da busca.
        const termo = nome.replace(/[\\%_]/g, "\\$&");
        where.nome_produto = { [Op.iLike]: `%${termo}%` };
    }
    if (tipo) where.tipo_produto = tipo;
    return Produto.findAll({
        where,
        order: [["nome_produto", "ASC"], ["id_produto", "ASC"]],
    });
}
const buscarPorId = id => Produto.findByPk(id);
const criar = dados => Produto.create(dados);

const remover = id => Produto.destroy({ where: { id_produto: id } });
module.exports = { listar, buscarPorId, criar, atualizar, remover };
async function atualizar(id, dados) {
    const produto = await Produto.findByPk(id);
    if (!produto) return null;
    return produto.update(dados);
}