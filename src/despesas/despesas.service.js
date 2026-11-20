const repository = require("./despesas.repository");

const falha = (mensagem, statusCode = 400) => Object.assign(new Error(mensagem), { statusCode });
const campos = ["tipo_despesa", "valor", "data_pagamento"];
const tiposPermitidos = ["manutencao", "energia", "agua", "limpeza", "outros"];

function validarId(valor, campo) {
    if (!["number", "string"].includes(typeof valor) || !/^[1-9][0-9]*$/.test(String(valor)) || Number(valor) > 2147483647) {
        throw falha(`${campo} deve ser um inteiro positivo valido.`);
    }
    return Number(valor);
}

function validarData(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith("0000")) {
        throw falha("data_pagamento deve estar no formato AAAA-MM-DD.");
    }
    const data = new Date(`${valor}T00:00:00Z`);
    if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
        throw falha("data_pagamento deve ser uma data valida.");
    }
    return valor;
}

function preparar(dados, parcial = false) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados) || !Object.keys(dados).length) {
        throw falha("Envie os dados da despesa em um objeto JSON.");
    }
    if (Object.keys(dados).some(campo => !campos.includes(campo))) {
        throw falha("Envie apenas tipo_despesa, valor e data_pagamento. O responsavel e definido pela autenticacao.");
    }
    const preparados = {};
    if (!parcial || Object.hasOwn(dados, "tipo_despesa")) {
        const tipo = typeof dados.tipo_despesa === "string" ? dados.tipo_despesa.trim().toLowerCase() : "";
        if (!tiposPermitidos.includes(tipo)) throw falha(`tipo_despesa deve ser um dos seguintes: ${tiposPermitidos.join(", ")}.`);
        preparados.tipo_despesa = tipo;
    }
    if (!parcial || Object.hasOwn(dados, "valor")) {
        const valor = dados.valor;
        if (!["number", "string"].includes(typeof valor) || !/^\d{1,10}(\.\d{1,2})?$/.test(String(valor)) || Number(valor) <= 0) {
            throw falha("valor deve ser maior que zero, com ate 10 digitos inteiros e 2 decimais. Use ponto decimal.");
        }
        preparados.valor = String(valor);
    }
    if (!parcial || Object.hasOwn(dados, "data_pagamento")) preparados.data_pagamento = validarData(dados.data_pagamento);
    return preparados;
}

const listar = () => repository.listar();

async function buscarPorId(id) {
    const despesa = await repository.buscarPorId(validarId(id, "id_despesa"));
    if (!despesa) throw falha("Despesa nao encontrada.", 404);
    return despesa;
}

function criar(dados, idUsuarioAutenticado) {
    const preparados = preparar(dados);
    // O ID vem de req.user, nunca do corpo enviado pelo cliente.
    preparados.id_usuario = validarId(idUsuarioAutenticado, "id_usuario");
    return repository.criar(preparados);
}

async function atualizar(id, dados) {
    const idValidado = validarId(id, "id_despesa");
    // A edição preserva o usuário que registrou a despesa originalmente.
    const despesa = await repository.atualizar(idValidado, preparar(dados, true));
    if (!despesa) throw falha("Despesa nao encontrada.", 404);
    return despesa;
}

async function remover(id) {
    const removidas = await repository.remover(validarId(id, "id_despesa"));
    if (!removidas) throw falha("Despesa nao encontrada.", 404);
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
