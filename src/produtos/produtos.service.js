const repository = require("./produtos.repository");
const falha = (mensagem, statusCode = 400) => Object.assign(new Error(mensagem), { statusCode });
const campos = ["nome_produto", "tipo_produto", "quantidade_produto", "valor_unitario"];
const tiposPermitidos = [
    "bebida_alcoolica",
    "bebida_nao_alcoolica",
    "guloseima",
    "ficha_sinuca",
];
function validarId(valor) {
    if (!/^[1-9][0-9]*$/.test(String(valor)) || Number(valor) > 2147483647) throw falha("ID do produto invalido.");
    return Number(valor);
}
function validarCorpo(dados) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados) || !Object.keys(dados).length) throw falha("Envie os campos do produto em um objeto JSON.");
    if (Object.keys(dados).some(c => !campos.includes(c))) throw falha("O corpo possui campos nao permitidos.");
}
function preparar(dados, atual) {
    const resultado = {};
    for (const [campo, limite] of [["nome_produto", 150], ["tipo_produto", 100]]) {
        if (!atual || Object.hasOwn(dados, campo)) {
            if (typeof dados[campo] !== "string" || !dados[campo].trim() || dados[campo].trim().length > limite) throw falha(`${campo} deve conter entre 1 e ${limite} caracteres.`);
            resultado[campo] = dados[campo].trim();
        }
    }
    if (resultado.tipo_produto) {
        resultado.tipo_produto = resultado.tipo_produto.toLowerCase();
        if (!tiposPermitidos.includes(resultado.tipo_produto)) {
            throw falha(`tipo_produto deve ser um dos seguintes: ${tiposPermitidos.join(", ")}.`);
        }
    }
    if (!atual || Object.hasOwn(dados, "valor_unitario")) {
        const valor = dados.valor_unitario;
        if (!["number", "string"].includes(typeof valor) || !/^\d{1,10}(\.\d{1,2})?$/.test(String(valor))) throw falha("valor_unitario deve ser nao negativo, com ate 10 digitos inteiros e 2 decimais. Use ponto decimal.");
        resultado.valor_unitario = String(valor);
    }
    const tipo = resultado.tipo_produto ?? atual?.tipo_produto;
    if (tipo === "ficha_sinuca") {
        // Estoque nao se aplica a fichas, mesmo que o cliente envie uma quantidade.
        resultado.quantidade_produto = 0;
    } else if (!atual || Object.hasOwn(dados, "quantidade_produto")) {
        const quantidade = dados.quantidade_produto ?? (!atual && !Object.hasOwn(dados, "quantidade_produto") ? 0 : null);
        if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > 2147483647) throw falha("quantidade_produto deve ser um inteiro nao negativo valido.");
        resultado.quantidade_produto = quantidade;
    }
    return resultado;
}
const listar = () => repository.listar();
async function buscarPorId(id) {
    const produto = await repository.buscarPorId(validarId(id));
    if (!produto) throw falha("Produto nao encontrado.", 404);
    return produto;
}
function criar(dados) {
    validarCorpo(dados);
    return repository.criar(preparar(dados));
}
async function atualizar(id, dados) {
    const codigo = validarId(id);
    validarCorpo(dados);
    const atual = await repository.buscarPorId(codigo);
    if (!atual) throw falha("Produto nao encontrado.", 404);
    const dadosValidados = preparar(dados, atual);
    const produto = await repository.atualizar(codigo, dadosValidados);
    if (!produto) throw falha("Produto nao encontrado.", 404);
    return produto;
}
async function remover(id) {
    if (!await repository.remover(validarId(id))) throw falha("Produto nao encontrado.", 404);
}
module.exports = { listar, buscarPorId, criar, atualizar, remover };
