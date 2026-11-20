const service = require("./auth.service");
function responderErro(res, erro) {
    if (erro.name === "SequelizeUniqueConstraintError") return res.status(409).json({ erro: "CPF ou email ja cadastrado." });
    if (erro.statusCode) return res.status(erro.statusCode).json({ erro: erro.message });
    return res.status(500).json({ erro: "Nao foi possivel concluir a autenticacao." });
}
function login(req, res) {
    try {
        res.set("Cache-Control", "no-store");
        return res.json(service.gerarSessao(req.user));
    } catch (erro) { return responderErro(res, erro); }
}
function consultarSessao(req, res) {
    res.set("Cache-Control", "no-store");
    return res.json({ usuario: service.usuarioDaSessao(req.user) });
}
async function cadastrarAdministrador(req, res) {
    try {
        const usuario = await service.cadastrarAdministrador(req.body, req.get("X-Setup-Token"));
        return res.location(`/usuarios/${usuario.id_usuario}`).status(201).json(usuario);
    } catch (erro) { return responderErro(res, erro); }
}
function solicitarRecuperacao(req, res) {
    res.set("Cache-Control", "no-store");
    try { return res.status(202).json(service.solicitarRecuperacao(req.body)); }
    catch (erro) { return responderErro(res, erro); }
}
async function redefinirSenha(req, res) {
    res.set("Cache-Control", "no-store");
    try { return res.json(await service.redefinirSenha(req.body)); }
    catch (erro) { return responderErro(res, erro); }
}
module.exports = { login, consultarSessao, cadastrarAdministrador, solicitarRecuperacao, redefinirSenha };
