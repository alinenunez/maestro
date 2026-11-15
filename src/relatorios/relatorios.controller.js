const service = require("./relatorios.service");

async function financeiro(req, res) {
    try {
        res.json(await service.financeiro(req.query));
    } catch (erro) {
        if (erro.statusCode) return res.status(erro.statusCode).json({ erro: erro.message });
        return res.status(500).json({ erro: "Nao foi possivel consultar o relatorio financeiro." });
    }
}

async function financeiroDetalhado(req, res) {
    try {
        res.json(await service.financeiroDetalhado(req.query));
    } catch (erro) {
        if (erro.statusCode) return res.status(erro.statusCode).json({ erro: erro.message });
        return res.status(500).json({ erro: "Nao foi possivel consultar o relatorio financeiro detalhado." });
    }
}

module.exports = { financeiro, financeiroDetalhado };
