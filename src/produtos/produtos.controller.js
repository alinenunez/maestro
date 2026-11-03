const service = require("./produtos.service");
function responderErro(res, erro) {
    if (erro.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).json({ erro: "Este produto possui vendas ou entradas de estoque vinculadas e nao pode ser deletado." });
    }
    if (erro.statusCode) return res.status(erro.statusCode).json({ erro: erro.message });
    return res.status(500).json({ erro: "Nao foi possivel concluir a operacao de produtos." });
}
async function listar(req, res) {
    try { res.json(await service.listar()); } catch (erro) { responderErro(res, erro); }
}
async function buscarPorId(req, res) {
    try { res.json(await service.buscarPorId(req.params.id)); } catch (erro) { responderErro(res, erro); }
}
async function criar(req, res) {
    try {
        const produto = await service.criar(req.body);
        res.location(`/produtos/${produto.id_produto}`).status(201).json(produto);
    } catch (erro) { responderErro(res, erro); }
}
async function atualizar(req, res) {
    try { res.json(await service.atualizar(req.params.id, req.body)); } catch (erro) { responderErro(res, erro); }
}
async function remover(req, res) {
    try { await service.remover(req.params.id); res.status(204).end(); } catch (erro) { responderErro(res, erro); }
}
module.exports = { listar, buscarPorId, criar, atualizar, remover };
