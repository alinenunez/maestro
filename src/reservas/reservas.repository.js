const { Op, QueryTypes, literal, where } = require("sequelize");
const connection = require("../database/connection");
const Reserva = require("../database/models/reserva.model");
const ReservaMesaItem = require("../database/models/reserva_mesa_item.model");
const Mesa = require("../database/models/mesa.model");

const incluirMesas = { model: Mesa, as: "mesas", through: { attributes: [] } };
const ordemMesas = [{ model: Mesa, as: "mesas" }, "numero_mesa", "ASC"];

function listar(periodo = {}) {
    const criterios = periodo.inicio ? {
        [Op.and]: [
            { data_horario_reserva: { [Op.lt]: periodo.fim } },
            where(literal('"ReservaMesa"."data_horario_reserva" + "ReservaMesa"."duracao_minutos" * INTERVAL \'1 minute\''), { [Op.gt]: periodo.inicio }),
        ],
    } : {};
    return Reserva.findAll({
        where: criterios,
        include: [incluirMesas],
        order: [["data_horario_reserva", "ASC"], ["id_reserva", "ASC"], ordemMesas],
    });
}

const buscarPorId = (id, transaction) => Reserva.findByPk(id, {
    include: [incluirMesas],
    order: [ordemMesas],
    transaction,
});

const buscarParaAtualizar = (id, transaction) => Reserva.findByPk(id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
});
const buscarItens = (id, transaction) => ReservaMesaItem.findAll({ where: { id_reserva: id }, transaction });
const bloquearMesas = (ids, transaction) => Mesa.findAll({
    where: { id_mesa: ids },
    order: [["id_mesa", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
});

function buscarConflitos(ids, inicio, fim, transaction, ignorarReserva = 0) {
    return connection.query(`
        SELECT DISTINCT ri.id_mesa
        FROM reserva_mesa_item ri
        JOIN reserva_mesa r ON r.id_reserva = ri.id_reserva
        WHERE ri.id_mesa IN (:ids)
          AND r.id_reserva <> :ignorarReserva
          AND r.data_horario_reserva < CAST(:fim AS TIMESTAMPTZ)
          AND r.data_horario_reserva + r.duracao_minutos * INTERVAL '1 minute' > CAST(:inicio AS TIMESTAMPTZ)
        ORDER BY ri.id_mesa
    `, {
        replacements: { ids, inicio: inicio.toISOString(), fim: fim.toISOString(), ignorarReserva },
        type: QueryTypes.SELECT,
        transaction,
    });
}

function consultarDisponibilidade(inicio, fim) {
    return connection.query(`
        SELECT m.id_mesa, m.numero_mesa, m.status AS status_atual,
               EXISTS (
                   SELECT 1 FROM reserva_mesa_item ri
                   JOIN reserva_mesa r ON r.id_reserva = ri.id_reserva
                   WHERE ri.id_mesa = m.id_mesa
                     AND r.data_horario_reserva < CAST(:fim AS TIMESTAMPTZ)
                     AND r.data_horario_reserva + r.duracao_minutos * INTERVAL '1 minute' > CAST(:inicio AS TIMESTAMPTZ)
               ) AS tem_reserva
        FROM mesa_sinuca m
        ORDER BY m.numero_mesa, m.id_mesa
    `, { replacements: { inicio: inicio.toISOString(), fim: fim.toISOString() }, type: QueryTypes.SELECT });
}

const criar = (dados, transaction) => Reserva.create(dados, { transaction });
const criarItens = (id, idsMesas, transaction) => ReservaMesaItem.bulkCreate(
    idsMesas.map(id_mesa => ({ id_reserva: id, id_mesa })),
    { transaction, validate: true },
);
const atualizar = (reserva, dados, transaction) => reserva.update(dados, { transaction });
const removerItens = (id, transaction) => ReservaMesaItem.destroy({ where: { id_reserva: id }, transaction });
const remover = (reserva, transaction) => reserva.destroy({ transaction });

module.exports = {
    listar, buscarPorId, buscarParaAtualizar, buscarItens, bloquearMesas, buscarConflitos,
    consultarDisponibilidade, criar, criarItens, atualizar, removerItens, remover,
};
