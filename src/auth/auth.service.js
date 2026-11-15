const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { timingSafeEqual, createHmac, randomUUID } = require("node:crypto");
const emailService = require("./auth.email");
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
    return { ...usuarioDaSessao(usuario), versao_senha: chaveVinculadaASenha(usuario, "sessao-v1").toString("hex") };
}

function gerarSessao(usuario) {
    const config = obterConfiguracaoJwt();
    // O perfil nao e usado como autoridade no token: sera lido do banco em cada acesso.
    if (typeof usuario.versao_senha !== "string" || !/^[a-f0-9]{64}$/.test(usuario.versao_senha)) {
        throw new Error("Versao da credencial indisponivel para criar a sessao.");
    }
    const token = jwt.sign({ versao_senha: usuario.versao_senha }, config.segredo, {
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


function chaveVinculadaASenha(usuario, finalidade) {
    if (typeof usuario.senha_hash !== "string" || !usuario.senha_hash) throw new Error("Credenciais indisponiveis.");
    return createHmac("sha256", obterConfiguracaoJwt().segredo)
        .update(JSON.stringify([finalidade, usuario.id_usuario, usuario.email.trim().toLowerCase(), usuario.senha_hash]))
        .digest();
}

function versaoSessaoValida(versao, usuario) {
    if (typeof versao !== "string" || !/^[a-f0-9]{64}$/i.test(versao)) return false;
    return timingSafeEqual(Buffer.from(versao, "hex"), chaveVinculadaASenha(usuario, "sessao-v1"));
}

function validarEmailRecuperacao(dados) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados) ||
        Object.keys(dados).some(campo => campo !== "email") ||
        typeof dados.email !== "string" || dados.email.trim().length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) {
        throw falha("Informe apenas um email valido.");
    }
    return dados.email.trim().toLowerCase();
}

function gerarTokenRecuperacao(usuario) {
    return jwt.sign({ finalidade: "recuperacao_senha" }, chaveVinculadaASenha(usuario, "recuperacao-v1"), {
        algorithm: "HS256",
        subject: String(usuario.id_usuario),
        issuer: "maestro-api",
        audience: "maestro-recuperacao-senha",
        expiresIn: 900,
        jwtid: randomUUID(),
    });
}

function solicitarRecuperacao(dados) {
    const email = validarEmailRecuperacao(dados);
    emailService.validarConfiguracao();
    // A resposta nao espera a busca da conta ou o SMTP, evitando diferencas de tempo por cadastro.
    setImmediate(async () => {
        try {
            const usuario = await repository.buscarCredenciaisPorEmail(email);
            if (!usuario || !usuario.situacao || !["administrador", "funcionario"].includes(usuario.tipo_acesso)) return;
            await emailService.enviarLinkRecuperacao(usuario.email, gerarTokenRecuperacao(usuario));
        } catch {
            // Nao registrar email, token, senha ou respostas do provedor.
            console.error("Nao foi possivel enviar as instrucoes de recuperacao. Confira o banco e o servico de email.");
        }
    });
    return { mensagem: "Se houver uma conta ativa com este email, voce recebera as instrucoes de recuperacao." };
}

const linkInvalido = () => falha("Link de recuperacao invalido ou expirado. Solicite um novo link.");

function verificarTokenRecuperacao(token, usuario) {
    try {
        const payload = jwt.verify(token, chaveVinculadaASenha(usuario, "recuperacao-v1"), {
            algorithms: ["HS256"],
            issuer: "maestro-api",
            audience: "maestro-recuperacao-senha",
            maxAge: 900,
        });
        if (payload.finalidade !== "recuperacao_senha" || payload.sub !== String(usuario.id_usuario) ||
            !Number.isInteger(payload.exp) || typeof payload.jti !== "string") throw linkInvalido();
    } catch { throw linkInvalido(); }
}

async function redefinirSenha(dados) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados) ||
        Object.keys(dados).some(campo => !["token", "senha", "confirmacao_senha"].includes(campo))) {
        throw falha("Envie token, senha e confirmacao_senha em um objeto JSON.");
    }
    if (typeof dados.token !== "string" || !dados.token || dados.token.length > 4096) throw linkInvalido();
    let decodificado;
    try { decodificado = jwt.decode(dados.token); } catch { throw linkInvalido(); }
    // Decode apenas localiza a conta. A autorizacao depende da verificacao de assinatura abaixo.
    if (typeof decodificado?.sub !== "string" || !/^[1-9][0-9]*$/.test(decodificado.sub) || Number(decodificado.sub) > 2147483647) {
        throw linkInvalido();
    }
    const usuario = await repository.buscarUsuarioAtivoPorId(Number(decodificado.sub));
    if (!usuario) throw linkInvalido();
    verificarTokenRecuperacao(dados.token, usuario);
    const preparados = await usuariosService.preparar({ senha: dados.senha, confirmacao_senha: dados.confirmacao_senha }, true);
    verificarTokenRecuperacao(dados.token, usuario);
    // A condicao pelo hash anterior torna o uso unico, inclusive com duas tentativas simultaneas.
    if (!await repository.atualizarSenhaPorRecuperacao(usuario, preparados.senha_hash)) throw linkInvalido();
    setImmediate(async () => {
        try { await emailService.enviarAvisoSenhaAlterada(usuario.email); }
        catch { console.error("Senha alterada, mas nao foi possivel enviar o aviso por email."); }
    });
    return { mensagem: "Senha redefinida com sucesso. Entre novamente no sistema." };
}

module.exports = { obterConfiguracaoJwt, validarLogin, usuarioDaSessao, autenticarUsuario, gerarSessao, cadastrarAdministradorInicial, versaoSessaoValida, solicitarRecuperacao, redefinirSenha };
