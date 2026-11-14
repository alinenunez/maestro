const Venda = require("../database/models/venda.model");
const ItemVenda = require("../database/models/item_venda.model");
const Produto = require("../database/models/produto.model");
const Usuario = require("../database/models/usuario.model");

const incluirUsuario = { model: Usuario, as: "usuario", attributes: ["id_usuario", "nome_completo"] };
const incluirItens = {
    model: ItemVenda,
    as: "itens",
    include: [{ model: Produto, as: "produto", attributes: ["id_produto", "nome_produto", "tipo_produto"] }],
};

const listar = () => Venda.findAll({
    include: [incluirUsuario],
    order: [["data_hora_venda", "DESC"], ["id_venda", "DESC"]],
});

const buscarPorId = (id, transaction) => Venda.findByPk(id, {
    include: [incluirUsuario, incluirItens],
    order: [[{ model: ItemVenda, as: "itens" }, "id_produto", "ASC"]],
    transaction,
});

const buscarUsuarioPorId = (id, transaction) => Usuario.findByPk(id, {
    attributes: ["id_usuario", "nome_completo", "situacao", "tipo_acesso"],
    transaction,
    lock: transaction.LOCK.SHARE,
});

const buscarProdutos = (ids, transaction) => Produto.findAll({
    where: { id_produto: ids },
    // A mesma ordem de bloqueio evita conflitos entre pedidos com varios produtos.
    order: [["id_produto", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
});

const criar = (dados, transaction) => Venda.create(dados, { transaction });
const criarItens = (itens, transaction) => ItemVenda.bulkCreate(itens, { transaction, validate: true });
const baixarEstoque = (id, quantidade, transaction) => Produto.decrement("quantidade_produto", {
    by: quantidade,
    where: { id_produto: id },
    transaction,
});

module.exports = { listar, buscarPorId, buscarUsuarioPorId, buscarProdutos, criar, criarItens, baixarEstoque };
