const service = require("./mesas.service");
function responderErro(res, erro) {
    if (erro.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ erro: "Ja existe uma mesa com esse numero." });
    }
    if (erro.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).json({ erro: "Esta mesa possui reservas vinculadas e nao pode ser excluida." });
    }
    if (erro.statusCode) return res.status(erro.statusCode).json({ erro: erro.message });
    return res.status(500).json({ erro: "Nao foi possivel concluir a operacao de mesas." });
}
async function listar(req, res) {
    try { res.json(await service.listar()); } catch (erro) { responderErro(res, erro); }
}
async function buscarPorId(req, res) {
    try { res.json(await service.buscarPorId(req.params.id)); } catch (erro) { responderErro(res, erro); }
}
async function criar(req, res) {
    try {
        const mesa = await service.criar(req.body);
        res.location(`/mesas/${mesa.id_mesa}`).status(201).json(mesa);
    } catch (erro) { responderErro(res, erro); }
}
async function atualizar(req, res) {
    try { res.json(await service.atualizar(req.params.id, req.body)); } catch (erro) { responderErro(res, erro); }
}
async function remover(req, res) {
    try { await service.remover(req.params.id); res.status(204).end(); } catch (erro) { responderErro(res, erro); }
}
module.exports = { listar, buscarPorId, criar, atualizar, remover };
