const service = require("./estoque.service");

function responderErro(res, erro) {
    if (erro.statusCode) return res.status(erro.statusCode).json({ erro: erro.message });
    return res.status(500).json({ erro: "Nao foi possivel concluir a operacao de estoque." });
}

async function listar(req, res) {
    try { res.json(await service.listar(req.query)); } catch (erro) { responderErro(res, erro); }
}

async function buscarPorId(req, res) {
    try { res.json(await service.buscarPorId(req.params.id)); } catch (erro) { responderErro(res, erro); }
}

async function criar(req, res) {
    try {
        const entrada = await service.criar(req.body);
        res.location(`/estoque/${entrada.id_estoque}`).status(201).json(entrada);
    } catch (erro) { responderErro(res, erro); }
}

module.exports = { listar, buscarPorId, criar };
