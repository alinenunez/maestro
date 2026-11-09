const service = require("./usuarios.service");
function responderErro(res, erro) {
    if (erro.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ erro: "CPF ou email ja cadastrado." });
    }
    if (erro.statusCode) return res.status(erro.statusCode).json({ erro: erro.message });
    return res.status(500).json({ erro: "Nao foi possivel concluir a operacao de usuarios." });
}
async function listar(req, res) {
    try { res.json(await service.listar()); } catch (erro) { responderErro(res, erro); }
}
async function buscarPorId(req, res) {
    try { res.json(await service.buscarPorId(req.params.id)); } catch (erro) { responderErro(res, erro); }
}
async function criar(req, res) {
    try {
        const usuario = await service.criar(req.body);
        res.location(`/usuarios/${usuario.id_usuario}`).status(201).json(usuario);
    } catch (erro) { responderErro(res, erro); }
}
async function atualizar(req, res) {
    try { res.json(await service.atualizar(req.params.id, req.body)); } catch (erro) { responderErro(res, erro); }
}
module.exports = { listar, buscarPorId, criar, atualizar };
