const ControleEstoque = require("../database/models/controle_estoque.model");
const Produto = require("../database/models/produto.model");

const incluirProduto = {
    model: Produto,
    as: "produto",
    attributes: ["id_produto", "nome_produto", "tipo_produto", "quantidade_produto"],
};

function listar(filtros = {}) {
    return ControleEstoque.findAll({
        where: filtros,
        include: [incluirProduto],
        order: [["data_compra", "DESC"], ["id_estoque", "DESC"]],
    });
}

const buscarPorId = (id, transaction) => ControleEstoque.findByPk(id, {
    include: [incluirProduto],
    transaction,
});

const buscarProdutoPorId = (id, transaction) => Produto.findByPk(id, {
    transaction,
    // Mantem o produto consistente enquanto a entrada e o saldo sao gravados.
    lock: transaction.LOCK.UPDATE,
});

const criar = (dados, transaction) => ControleEstoque.create(dados, { transaction });

const incrementarQuantidade = (id, quantidade, transaction) => Produto.increment("quantidade_produto", {
    by: quantidade,
    where: { id_produto: id },
    transaction,
});

module.exports = { listar, buscarPorId, buscarProdutoPorId, criar, incrementarQuantidade };
