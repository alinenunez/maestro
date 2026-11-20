const Despesa = require("../database/models/despesa.model");
const Usuario = require("../database/models/usuario.model");

const incluirUsuario = {
    model: Usuario,
    as: "usuario",
    attributes: ["id_usuario", "nome_completo"],
};

const listar = () => Despesa.findAll({
    include: [incluirUsuario],
    order: [["data_pagamento", "DESC"], ["id_despesa", "DESC"]],
});
const buscarPorId = id => Despesa.findByPk(id, { include: [incluirUsuario] });
const criar = dados => Despesa.create(dados);

async function atualizar(id, dados) {
    const [, despesas] = await Despesa.update(dados, { where: { id_despesa: id }, returning: true });
    return despesas[0] || null;
}
const remover = id => Despesa.destroy({ where: { id_despesa: id } });

module.exports = { listar, buscarPorId, criar, atualizar, remover };
