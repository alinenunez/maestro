const bcrypt = require("bcrypt");
const repository = require("./usuarios.repository");
const falha = (mensagem, statusCode = 400) => Object.assign(new Error(mensagem), { statusCode });
const campos = ["nome_completo", "cpf", "situacao", "data_inicio", "tipo_contratacao", "tipo_acesso", "email", "data_nascimento", "senha", "confirmacao_senha"];
const acessos = ["administrador", "funcionario"];
const contratacoes = ["temporario", "efetivo"];
function validarId(valor) {
    if (!/^[1-9][0-9]*$/.test(String(valor)) || Number(valor) > 2147483647) throw falha("ID do usuario invalido.");
    return Number(valor);
}
function texto(valor, campo, limite) {
    if (typeof valor !== "string" || !valor.trim() || valor.trim().length > limite) {
        throw falha(`${campo} deve conter entre 1 e ${limite} caracteres.`);
    }
    return valor.trim();
}
function dataValida(valor, campo) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith("0000")) {
        throw falha(`${campo} deve estar no formato AAAA-MM-DD.`);
    }
    const data = new Date(`${valor}T00:00:00Z`);
    if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
        throw falha(`${campo} deve ser uma data valida.`);
    }
    return valor;
}
// Mesmo create/update podem devolver o hash na instancia; nunca o enviar na resposta.
function dadosPublicos(usuario) {
    const dados = usuario.get({ plain: true });
    delete dados.senha_hash;
    return dados;
}
async function preparar(dados, parcial = false) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados) || !Object.keys(dados).length) {
        throw falha("Envie os dados do usuario em um objeto JSON.");
    }
    if (Object.keys(dados).some(campo => !campos.includes(campo))) throw falha("O corpo possui campos nao permitidos.");
    const resultado = {};
    const presente = campo => !parcial || Object.hasOwn(dados, campo);
    if (presente("nome_completo")) resultado.nome_completo = texto(dados.nome_completo, "nome_completo", 150);
    if (presente("cpf")) {
        const cpf = texto(dados.cpf, "cpf", 14);
        if (!/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(cpf)) throw falha("CPF deve conter 11 digitos, com ou sem pontuacao.");
        resultado.cpf = cpf.replace(/\D/g, "");
    }
    if (presente("email")) {
        resultado.email = texto(dados.email, "email", 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resultado.email)) throw falha("Informe um email valido.");
    }
    for (const campo of ["data_inicio", "data_nascimento"]) {
        if (presente(campo)) resultado[campo] = dataValida(dados[campo], campo);
    }
    if (presente("tipo_acesso")) {
        resultado.tipo_acesso = texto(dados.tipo_acesso, "tipo_acesso", 50).toLowerCase();
        if (!acessos.includes(resultado.tipo_acesso)) throw falha("tipo_acesso deve ser administrador ou funcionario.");
    }
    if (presente("tipo_contratacao")) {
        resultado.tipo_contratacao = texto(dados.tipo_contratacao, "tipo_contratacao", 50).toLowerCase();
        if (!contratacoes.includes(resultado.tipo_contratacao)) throw falha("tipo_contratacao deve ser temporario ou efetivo.");
    }
    if (Object.hasOwn(dados, "situacao")) {
        if (typeof dados.situacao !== "boolean") throw falha("situacao deve ser true ou false.");
        resultado.situacao = dados.situacao;
    } else if (!parcial) resultado.situacao = true;
    if (!parcial || Object.hasOwn(dados, "senha") || Object.hasOwn(dados, "confirmacao_senha")) {
        if (typeof dados.senha !== "string" || !dados.senha.trim()) throw falha("Informe a senha.");
        if (Buffer.byteLength(dados.senha, "utf8") > 72) throw falha("A senha excede o limite de 72 bytes do bcrypt.");
        if (dados.senha !== dados.confirmacao_senha) throw falha("A confirmacao de senha deve ser igual a senha.");
        resultado.senha_hash = await bcrypt.hash(dados.senha, 12);
    }
    return resultado;
}
async function listar() {
    return (await repository.listar()).map(dadosPublicos);
}
async function buscarPorId(id) {
    const usuario = await repository.buscarPorId(validarId(id));
    if (!usuario) throw falha("Usuario nao encontrado.", 404);
    return dadosPublicos(usuario);
}
async function criar(dados) {
    const preparados = await preparar(dados);
    if (preparados.tipo_acesso !== "funcionario") {
        throw falha("Esta operacao cadastra funcionarios. O administrador utiliza o cadastro inicial.");
    }
    return dadosPublicos(await repository.criar(preparados));
}
async function atualizar(id, dados, operador) {
    const codigo = validarId(id);
    const atual = await repository.buscarPorId(codigo);
    if (!atual) throw falha("Usuario nao encontrado.", 404);
    const preparados = await preparar(dados, true);
    if (preparados.tipo_acesso && preparados.tipo_acesso !== atual.tipo_acesso) {
        throw falha("O perfil de acesso nao pode ser alterado neste cadastro.");
    }
    if (operador?.id_usuario === codigo && preparados.situacao === false) {
        throw falha("O administrador nao pode inativar o proprio acesso.", 409);
    }
    const usuario = await repository.atualizar(codigo, preparados);
    if (!usuario) throw falha("Usuario nao encontrado.", 404);
    return dadosPublicos(usuario);
}
async function listarResponsaveis() {
    return (await repository.listarResponsaveis()).map(dadosPublicos);
}
module.exports = { listar, buscarPorId, criar, atualizar, listarResponsaveis, preparar, dadosPublicos };
