const connection = require("../database/connection");
const repository = require("./estoque.repository");

const falha = (mensagem, statusCode = 400) => Object.assign(new Error(mensagem), { statusCode });
const campos = ["id_produto", "data_compra", "quantidade_adquirida", "valor_total"];
const limiteInteiro = 2147483647;

function validarId(valor, campo) {
    if (!["number", "string"].includes(typeof valor) || !/^[1-9][0-9]*$/.test(String(valor)) || Number(valor) > limiteInteiro) {
        throw falha(`${campo} deve ser um inteiro positivo valido.`);
    }
    return Number(valor);
}

function validarData(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith("0000")) {
        throw falha("data_compra deve estar no formato AAAA-MM-DD.");
    }
    const data = new Date(`${valor}T00:00:00Z`);
    if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
        throw falha("data_compra deve ser uma data valida.");
    }
    return valor;
}

function preparar(dados) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados) || !Object.keys(dados).length) {
        throw falha("Envie os dados da entrada de estoque em um objeto JSON.");
    }
    if (Object.keys(dados).some(campo => !campos.includes(campo))) {
        throw falha("O corpo possui campos nao permitidos.");
    }
    const idProduto = validarId(dados.id_produto, "id_produto");
    const dataCompra = validarData(dados.data_compra);
    const quantidade = dados.quantidade_adquirida;
    if (!Number.isInteger(quantidade) || quantidade <= 0 || quantidade > limiteInteiro) {
        throw falha("quantidade_adquirida deve ser um inteiro positivo valido.");
    }
    const valor = dados.valor_total;
    if (!["number", "string"].includes(typeof valor) || !/^\d{1,10}(\.\d{1,2})?$/.test(String(valor))) {
        throw falha("valor_total deve ser nao negativo, com ate 10 digitos inteiros e 2 decimais. Use ponto decimal.");
    }
    return {
        id_produto: idProduto,
        data_compra: dataCompra,
        quantidade_adquirida: quantidade,
        valor_total: String(valor),
    };
}

function listar(filtros = {}) {
    if (Object.keys(filtros).some(campo => campo !== "id_produto")) {
        throw falha("Filtro permitido: id_produto.");
    }
    const criterios = {};
    if (filtros.id_produto !== undefined) criterios.id_produto = validarId(filtros.id_produto, "id_produto");
    return repository.listar(criterios);
}

async function buscarPorId(id) {
    const entrada = await repository.buscarPorId(validarId(id, "id_estoque"));
    if (!entrada) throw falha("Entrada de estoque nao encontrada.", 404);
    return entrada;
}

async function criar(dados) {
    const preparados = preparar(dados);

    // As duas gravacoes sao confirmadas juntas; uma falha desfaz ambas.
    return connection.transaction(async transaction => {
        const produto = await repository.buscarProdutoPorId(preparados.id_produto, transaction);
        if (!produto) throw falha("Produto nao encontrado.", 404);
        if (produto.tipo_produto === "ficha_sinuca") {
            throw falha("Fichas de sinuca nao possuem entradas de estoque.");
        }
        if (produto.quantidade_produto + preparados.quantidade_adquirida > limiteInteiro) {
            throw falha("A entrada ultrapassa o limite de quantidade do produto.", 409);
        }

        const entrada = await repository.criar(preparados, transaction);
        await repository.incrementarQuantidade(preparados.id_produto, preparados.quantidade_adquirida, transaction);
        return repository.buscarPorId(entrada.id_estoque, transaction);
    });
}

module.exports = { listar, buscarPorId, criar };
