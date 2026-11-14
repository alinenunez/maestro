const service = require("./reservas.service");

function responderErro(res, erro) {
    if (erro.statusCode) return res.status(erro.statusCode).json({ erro: erro.message });
    return res.status(500).json({ erro: "Nao foi possivel concluir a operacao de reservas." });
}

async function listar(req, res) {
    try { res.json(await service.listar(req.query)); } catch (erro) { responderErro(res, erro); }
}
async function buscarPorId(req, res) {
    try { res.json(await service.buscarPorId(req.params.id)); } catch (erro) { responderErro(res, erro); }
}
async function consultarDisponibilidade(req, res) {
    try { res.json(await service.consultarDisponibilidade(req.query)); } catch (erro) { responderErro(res, erro); }
}
async function criar(req, res) {
    try {
        const reserva = await service.criar(req.body);
        res.location(`/reservas/${reserva.id_reserva}`).status(201).json(reserva);
    } catch (erro) { responderErro(res, erro); }
}
async function atualizar(req, res) {
    try { res.json(await service.atualizar(req.params.id, req.body)); } catch (erro) { responderErro(res, erro); }
}
async function remover(req, res) {
    try { await service.remover(req.params.id); res.status(204).end(); } catch (erro) { responderErro(res, erro); }
}

module.exports = { listar, buscarPorId, consultarDisponibilidade, criar, atualizar, remover };
