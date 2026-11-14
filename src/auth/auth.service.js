const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { timingSafeEqual } = require("node:crypto");
const repository = require("./auth.repository");
const usuariosService = require("../usuarios/usuarios.service");
const falha = (mensagem, statusCode = 400) => Object.assign(new Error(mensagem), { statusCode });

function obterConfiguracaoJwt() {
    const segredo = process.env.JWT_SECRET;
    if (typeof segredo !== "string" || Buffer.byteLength(segredo.trim(), "utf8") < 32) {
        throw new Error("Configure JWT_SECRET no .env com uma chave aleatoria de pelo menos 32 caracteres.");
    }
    return { segredo, emissor: "maestro-api", publico: "maestro-web", duracaoSegundos: 3600 };
}

function validarLogin(dados) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) throw falha("Informe email e senha.");
    if (Object.keys(dados).some(campo => !["email", "senha"].includes(campo))) throw falha("Campos permitidos no login: email e senha.");
    if (typeof dados.email !== "string" || !dados.email.trim() || dados.email.trim().length > 254) throw falha("Informe um email valido.");
    if (typeof dados.senha !== "string" || !dados.senha.trim() || Buffer.byteLength(dados.senha, "utf8") > 72) throw falha("Informe uma senha valida de ate 72 bytes.");
}

function usuarioDaSessao(usuario) {
    return {
        id_usuario: usuario.id_usuario,
        nome_completo: usuario.nome_completo,
        email: usuario.email,
        tipo_acesso: usuario.tipo_acesso,
        situacao: usuario.situacao,
    };
}

async function autenticarUsuario(email, senha) {
    const usuario = await repository.buscarCredenciaisPorEmail(email.trim().toLowerCase());
    if (!usuario || typeof usuario.senha_hash !== "string") return null;
    const confere = await bcrypt.compare(senha, usuario.senha_hash);
    if (!confere || !usuario.situacao || !["administrador", "funcionario"].includes(usuario.tipo_acesso)) return null;
    return usuarioDaSessao(usuario);
}

function gerarSessao(usuario) {
    const config = obterConfiguracaoJwt();
    // O perfil nao e usado como autoridade no token: sera lido do banco em cada acesso.
    const token = jwt.sign({}, config.segredo, {
        algorithm: "HS256",
        subject: String(usuario.id_usuario),
        issuer: config.emissor,
        audience: config.publico,
        expiresIn: config.duracaoSegundos,
    });
    return { token, tipo: "Bearer", expira_em: config.duracaoSegundos, usuario: usuarioDaSessao(usuario) };
}

function validarChaveCadastroInicial(chave) {
    const configurada = process.env.ADMIN_SETUP_TOKEN;
    if (!configurada || Buffer.byteLength(configurada, "utf8") < 32) throw falha("Cadastro inicial desabilitado.", 403);
    if (typeof chave !== "string") throw falha("Chave de cadastro inicial invalida.", 403);
    const recebida = Buffer.from(chave);
    const esperada = Buffer.from(configurada);
    if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) throw falha("Chave de cadastro inicial invalida.", 403);
}

async function cadastrarAdministradorInicial(dados, chave) {
    validarChaveCadastroInicial(chave);
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) throw falha("Envie os dados do administrador em um objeto JSON.");
    if (Object.hasOwn(dados, "tipo_acesso") && dados.tipo_acesso !== "administrador") throw falha("O cadastro inicial e exclusivo do administrador.");
    if (Object.hasOwn(dados, "situacao") && dados.situacao !== true) throw falha("O administrador inicial deve estar ativo.");
    const preparados = await usuariosService.preparar({ ...dados, tipo_acesso: "administrador", situacao: true });
    const usuario = await repository.criarAdministradorInicial(preparados);
    if (!usuario) throw falha("O administrador ja foi cadastrado. Utilize o login.", 409);
    return usuariosService.dadosPublicos(usuario);
}

module.exports = { obterConfiguracaoJwt, validarLogin, usuarioDaSessao, autenticarUsuario, gerarSessao, cadastrarAdministradorInicial };
