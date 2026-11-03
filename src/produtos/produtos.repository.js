const Produto = require("../database/models/produto.model");

const listar = () => Produto.findAll({ order: [["nome_produto", "ASC"], ["id_produto", "ASC"]] });
const buscarPorId = id => Produto.findByPk(id);
const criar = dados => Produto.create(dados);
async function atualizar(id, dados) {
    const produto = await Produto.findByPk(id);
    if (!produto) return null;
    return produto.update(dados);
}
const remover = id => Produto.destroy({ where: { id_produto: id } });
module.exports = { listar, buscarPorId, criar, atualizar, remover };
