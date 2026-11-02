const repository = require("./mesas.repository");
const falha = (mensagem, statusCode = 400) => Object.assign(new Error(mensagem), { statusCode });
function validarId(valor) {
    if (!/^[1-9][0-9]*$/.test(String(valor)) || Number(valor) > 2147483647) {
        throw falha("ID da mesa deve ser um inteiro positivo valido.");
    }
    return Number(valor);
}
function validarDados(dados, parcial = false) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) throw falha("Envie um objeto JSON.");
    const chaves = Object.keys(dados);
    if (!chaves.length || chaves.some(c => !["numero_mesa", "status"].includes(c))) {
        throw falha("Informe apenas numero_mesa e/ou status.");
    }
    if (!parcial || Object.hasOwn(dados, "numero_mesa")) {
        if (!Number.isInteger(dados.numero_mesa) || dados.numero_mesa < 1 || dados.numero_mesa > 2147483647) {
            throw falha("numero_mesa deve ser um inteiro positivo valido.");
        }
    }
    if (Object.hasOwn(dados, "status") && !["ocupada", "disponivel", "manutencao"].includes(dados.status)) {
        throw falha("Status deve ser ocupada, disponivel ou manutencao.");
    }
    return { ...dados };
}
async function buscarPorId(id) {
    const mesa = await repository.buscarPorId(validarId(id));
    if (!mesa) throw falha("Mesa nao encontrada.", 404);
    return mesa;
}
const listar = () => repository.listar();
const criar = dados => repository.criar(validarDados(dados));
async function atualizar(id, dados) {
    const mesa = await repository.atualizar(validarId(id), validarDados(dados, true));
    if (!mesa) throw falha("Mesa nao encontrada.", 404);
    return mesa;
}
async function remover(id) {
    if (!await repository.remover(validarId(id))) throw falha("Mesa nao encontrada.", 404);
}
module.exports = { listar, buscarPorId, criar, atualizar, remover };
