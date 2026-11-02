const Mesa = require("../database/models/mesa.model");
const listar = () => Mesa.findAll({ order: [["numero_mesa", "ASC"]] });
const buscarPorId = (id) => Mesa.findByPk(id);
const criar = (dados) => Mesa.create(dados);
async function atualizar(id, dados) {
    const [, mesas] = await Mesa.update(dados, { where: { id_mesa: id }, returning: true });
    return mesas[0] || null;
}
const remover = (id) => Mesa.destroy({ where: { id_mesa: id } });
module.exports = { listar, buscarPorId, criar, atualizar, remover };
