const { Transaction } = require("sequelize");
const connection = require("../database/connection");
const repository = require("./reservas.repository");

const falha = (mensagem, statusCode = 400) => Object.assign(new Error(mensagem), { statusCode });
const campos = ["nome_cliente", "telefone_cliente", "data_horario_reserva", "duracao_minutos", "mesas"];
const isolamento = { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED };

function validarId(valor, campo) {
    if (!["number", "string"].includes(typeof valor) || !/^[1-9][0-9]*$/.test(String(valor)) || Number(valor) > 2147483647) {
        throw falha(`${campo} deve ser um inteiro positivo valido.`);
    }
    return Number(valor);
}

function validarCorpo(dados) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados) || !Object.keys(dados).length) {
        throw falha("Envie os dados da reserva em um objeto JSON.");
    }
    if (Object.keys(dados).some(campo => !campos.includes(campo))) throw falha("O corpo possui campos nao permitidos.");
}

function texto(valor, campo, limite) {
    if (typeof valor !== "string" || !valor.trim() || valor.trim().length > limite) {
        throw falha(`${campo} deve conter entre 1 e ${limite} caracteres.`);
    }
    return valor.trim();
}

function dataValida(valor, campo) {
    const partes = typeof valor === "string" && valor.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/);
    if (!partes || valor.startsWith("0000")) {
        throw falha(`${campo} deve conter data e horario ISO com fuso, como 2026-11-20T20:00:00-03:00.`);
    }
    const dia = new Date(`${partes[1]}T00:00:00Z`);
    if (Number.isNaN(dia.getTime()) || dia.toISOString().slice(0, 10) !== partes[1] ||
        Number(partes[2]) > 23 || Number(partes[3]) > 59 || Number(partes[4] || 0) > 59) {
        throw falha(`${campo} deve ser uma data e horario validos.`);
    }
    const fuso = partes[6];
    if (fuso !== "Z") {
        const horas = Number(fuso.slice(1, 3));
        const minutos = Number(fuso.slice(4, 6));
        if (horas > 14 || minutos > 59 || (horas === 14 && minutos !== 0)) throw falha(`${campo} possui fuso invalido.`);
    }
    const data = new Date(valor);
    if (Number.isNaN(data.getTime()) || data.getUTCFullYear() < 1 || data.getUTCFullYear() > 9999) {
        throw falha(`${campo} deve ser uma data e horario validos.`);
    }
    return data;
}

function calcularFim(inicio, duracao) {
    const fim = new Date(inicio.getTime() + duracao * 60000);
    if (Number.isNaN(fim.getTime()) || fim.getUTCFullYear() > 9999) throw falha("O fim da reserva ultrapassa o limite de data permitido.");
    return fim;
}

function preparar(dados) {
    validarCorpo(dados);
    const nome = texto(dados.nome_cliente, "nome_cliente", 150);
    const telefone = texto(dados.telefone_cliente, "telefone_cliente", 20);
    const digitos = telefone.replace(/\D/g, "");
    if (!/^\+?[0-9() .-]+$/.test(telefone) || digitos.length < 8 || digitos.length > 15) {
        throw falha("telefone_cliente deve conter de 8 a 15 digitos, com formatacao opcional.");
    }
    const inicio = dataValida(dados.data_horario_reserva, "data_horario_reserva");
    if (!Number.isInteger(dados.duracao_minutos) || dados.duracao_minutos <= 0 || dados.duracao_minutos > 2147483647) {
        throw falha("duracao_minutos deve ser um inteiro positivo valido.");
    }
    calcularFim(inicio, dados.duracao_minutos);
    if (!Array.isArray(dados.mesas) || !dados.mesas.length) throw falha("Selecione pelo menos uma mesa.");
    const mesas = dados.mesas.map(id => validarId(id, "id_mesa"));
    if (new Set(mesas).size !== mesas.length) throw falha("Nao repita a mesma mesa na reserva.");
    return {
        nome_cliente: nome,
        telefone_cliente: telefone,
        data_horario_reserva: inicio,
        duracao_minutos: dados.duracao_minutos,
        mesas,
    };
}

function periodoConsulta(filtros, obrigatorio = false) {
    if (Object.keys(filtros).some(campo => !["inicio", "fim"].includes(campo))) throw falha("Filtros permitidos: inicio e fim.");
    if (!obrigatorio && filtros.inicio === undefined && filtros.fim === undefined) return {};
    const inicio = dataValida(filtros.inicio, "inicio");
    const fim = dataValida(filtros.fim, "fim");
    if (fim <= inicio) throw falha("fim deve ser posterior a inicio.");
    return { inicio, fim };
}

function apresentar(registro) {
    const reserva = registro.get({ plain: true });
    reserva.data_horario_fim = calcularFim(new Date(reserva.data_horario_reserva), reserva.duracao_minutos).toISOString();
    return reserva;
}

async function listar(filtros = {}) {
    return (await repository.listar(periodoConsulta(filtros))).map(apresentar);
}

async function buscarPorId(id) {
    const reserva = await repository.buscarPorId(validarId(id, "id_reserva"));
    if (!reserva) throw falha("Reserva nao encontrada.", 404);
    return apresentar(reserva);
}

async function consultarDisponibilidade(filtros = {}) {
    const { inicio, fim } = periodoConsulta(filtros, true);
    const mesas = await repository.consultarDisponibilidade(inicio, fim);
    return mesas.map(mesa => ({
        ...mesa,
        disponivel_para_reserva: mesa.status_atual !== "manutencao" && !mesa.tem_reserva,
    }));
}

async function validarMesas(preparados, mesasBloqueadas, transaction, ignorarReserva = 0) {
    const porId = new Map(mesasBloqueadas.map(mesa => [mesa.id_mesa, mesa]));
    for (const id of preparados.mesas) {
        const mesa = porId.get(id);
        if (!mesa) throw falha(`Mesa ${id} nao encontrada.`, 404);
        if (mesa.status === "manutencao") throw falha(`A mesa ${mesa.numero_mesa} esta em manutencao.`, 409);
    }
    const fim = calcularFim(preparados.data_horario_reserva, preparados.duracao_minutos);
    const conflitos = await repository.buscarConflitos(preparados.mesas, preparados.data_horario_reserva, fim, transaction, ignorarReserva);
    if (conflitos.length) {
        const numeros = conflitos.map(conflito => porId.get(conflito.id_mesa).numero_mesa).join(", ");
        throw falha(`Ja existem reservas nesse periodo para as mesas: ${numeros}.`, 409);
    }
}

async function criar(dados) {
    const preparados = preparar(dados);
    return connection.transaction(isolamento, async transaction => {
        // Bloqueia as mesas antes da consulta de conflitos, inclusive em cadastros simultaneos.
        const mesas = await repository.bloquearMesas(preparados.mesas, transaction);
        await validarMesas(preparados, mesas, transaction);
        const { mesas: idsMesas, ...camposReserva } = preparados;
        const reserva = await repository.criar(camposReserva, transaction);
        await repository.criarItens(reserva.id_reserva, idsMesas, transaction);
        return apresentar(await repository.buscarPorId(reserva.id_reserva, transaction));
    });
}

async function atualizar(id, dados) {
    const codigo = validarId(id, "id_reserva");
    validarCorpo(dados);
    return connection.transaction(isolamento, async transaction => {
        const atual = await repository.buscarParaAtualizar(codigo, transaction);
        if (!atual) throw falha("Reserva nao encontrada.", 404);
        const itensAtuais = await repository.buscarItens(codigo, transaction);
        const idsAtuais = itensAtuais.map(item => item.id_mesa);
        const preparados = preparar({
            nome_cliente: atual.nome_cliente,
            telefone_cliente: atual.telefone_cliente,
            data_horario_reserva: new Date(atual.data_horario_reserva).toISOString(),
            duracao_minutos: atual.duracao_minutos,
            mesas: idsAtuais,
            ...dados,
        });
        // Protege tanto as mesas liberadas quanto as novas mesas da reserva.
        const idsBloquear = [...new Set([...idsAtuais, ...preparados.mesas])];
        const mesas = await repository.bloquearMesas(idsBloquear, transaction);
        await validarMesas(preparados, mesas, transaction, codigo);
        const { mesas: idsMesas, ...camposReserva } = preparados;
        await repository.atualizar(atual, camposReserva, transaction);
        await repository.removerItens(codigo, transaction);
        await repository.criarItens(codigo, idsMesas, transaction);
        return apresentar(await repository.buscarPorId(codigo, transaction));
    });
}

async function remover(id) {
    const codigo = validarId(id, "id_reserva");
    return connection.transaction(isolamento, async transaction => {
        const reserva = await repository.buscarParaAtualizar(codigo, transaction);
        if (!reserva) throw falha("Reserva nao encontrada.", 404);
        const itens = await repository.buscarItens(codigo, transaction);
        if (itens.length) await repository.bloquearMesas(itens.map(item => item.id_mesa), transaction);
        await repository.removerItens(codigo, transaction);
        await repository.remover(reserva, transaction);
    });
}

module.exports = { listar, buscarPorId, consultarDisponibilidade, criar, atualizar, remover };
