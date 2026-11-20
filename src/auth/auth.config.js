const passport = require("passport");
const { rateLimit } = require("express-rate-limit");
const { createHash } = require("node:crypto");
const LocalStrategy = require("passport-local").Strategy;
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const service = require("./auth.service");
const repository = require("./auth.repository");

const ambos = ["administrador", "funcionario"];
const permissoes = {
    GERENCIAR_USUARIOS: ["administrador"],
    CONSULTAR_PRODUTOS: ambos,
    GERENCIAR_PRODUTOS: ["administrador"],
    CONSULTAR_MESAS: ambos,
    GERENCIAR_MESAS: ["administrador"],
    ATUALIZAR_STATUS_MESA: ambos,
    GERENCIAR_ESTOQUE: ambos,
    REGISTRAR_VENDAS: ambos,
    GERENCIAR_RESERVAS: ambos,
    CONSULTAR_DASHBOARD: ambos,
    GERENCIAR_DESPESAS: ["administrador"],
    CONSULTAR_RELATORIOS: ["administrador"],
};

function configureLocalStrategy() {
    passport.use(new LocalStrategy({ usernameField: "email", passwordField: "senha" }, async (email, senha, done) => {
        try {
            const usuario = await service.autenticarUsuario(email, senha);
            return done(null, usuario || false);
        } catch (erro) { return done(erro); }
    }));
}

function configureJwtStrategy() {
    const config = service.obterConfiguracaoJwt();
    passport.use(new JwtStrategy({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.segredo,
        algorithms: ["HS256"],
        issuer: config.emissor,
        audience: config.publico,
        ignoreExpiration: false,
        jsonWebTokenOptions: { maxAge: config.duracaoSegundos },
    }, async (payload, done) => {
        try {
            if (typeof payload.sub !== "string" || !/^[1-9][0-9]*$/.test(payload.sub) || Number(payload.sub) > 2147483647 || !Number.isInteger(payload.exp)) return done(null, false);
            const usuario = await repository.buscarUsuarioAtivoPorId(Number(payload.sub));
            return done(null, usuario && service.versaoSessaoValida(payload.versao_senha, usuario) ? service.usuarioDaSessao(usuario) : false);
        } catch (erro) { return done(erro); }
    }));
}

function requireLocalAuth(req, res, next) {
    try { service.validarLogin(req.body); } catch (erro) {
        return res.status(400).json({ erro: erro.message });
    }
    return passport.authenticate("local", { session: false }, (erro, usuario) => {
        if (erro) return res.status(503).json({ erro: "Nao foi possivel verificar o login. Tente novamente." });
        if (!usuario) return res.status(401).json({ erro: "Email ou senha invalidos, ou usuario inativo." });
        req.user = usuario;
        return next();
    })(req, res, next);
}

function requireJWTAuth(req, res, next) {
    return passport.authenticate("jwt", { session: false }, (erro, usuario) => {
        if (erro) return res.status(503).json({ erro: "Nao foi possivel verificar o acesso. Tente novamente." });
        if (!usuario) return res.status(401).json({ erro: "Autenticacao necessaria. Entre novamente no sistema." });
        req.user = usuario;
        return next();
    })(req, res, next);
}

function requirePermissao(permissao) {
    return [requireJWTAuth, (req, res, next) => {
        if (!permissoes[permissao]?.includes(req.user.tipo_acesso)) {
            return res.status(403).json({ erro: "Seu perfil nao tem permissao para esta operacao." });
        }
        return next();
    }];
}

// Atendentes podem atualizar a ocupacao, mas nao renumerar mesas.
function verificarAlteracaoMesa(req, res, next) {
    if (req.user.tipo_acesso === "funcionario" && req.body && Object.keys(req.body).some(campo => campo !== "status")) {
        return res.status(403).json({ erro: "Funcionarios podem alterar somente o status da mesa." });
    }
    return next();
}


const limitarSolicitacaoRecuperacao = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { erro: "Muitas solicitacoes de recuperacao. Aguarde antes de tentar novamente." },
});

const limitarRecuperacaoPorEmail = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: req => typeof req.body?.email !== "string" || req.body.email.trim().length > 254,
    keyGenerator: req => createHash("sha256").update(req.body.email.trim().toLowerCase()).digest("hex"),
    message: { erro: "Muitas solicitacoes para este email. Aguarde antes de tentar novamente." },
});

const limitarRedefinicaoSenha = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { erro: "Muitas tentativas de redefinicao. Aguarde antes de tentar novamente." },
});

const limitarCadastroAdministrador = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { erro: "Muitas tentativas de cadastro de administrador. Aguarde antes de tentar novamente." },
});

module.exports = { configureLocalStrategy, configureJwtStrategy, requireLocalAuth, requireJWTAuth, requirePermissao, verificarAlteracaoMesa, limitarSolicitacaoRecuperacao, limitarRecuperacaoPorEmail, limitarRedefinicaoSenha, limitarCadastroAdministrador };
