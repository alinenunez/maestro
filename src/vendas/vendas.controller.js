const service = require("./vendas.service");

function responderErro(res, erro) {
    if (erro.statusCode) return res.status(erro.statusCode).json({ erro: erro.message });
    return res.status(500).json({ erro: "Nao foi possivel concluir a operacao de vendas." });
}

async function listar(req, res) {
    try { res.json(await service.listar()); } catch (erro) { responderErro(res, erro); }
}

async function buscarPorId(req, res) {
    try { res.json(await service.buscarPorId(req.params.id)); } catch (erro) { responderErro(res, erro); }
}

async function criar(req, res) {
    try {
        const venda = await service.criar(req.body);
        res.location(`/vendas/${venda.id_venda}`).status(201).json(venda);
    } catch (erro) { responderErro(res, erro); }
}

module.exports = { listar, buscarPorId, criar };
