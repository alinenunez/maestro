const service = require("./dashboard.service");

async function consultar(req, res) {
    try {
        res.set("Cache-Control", "no-store");
        res.json(await service.consultar(req.query));
    } catch (erro) {
        if (erro.statusCode) return res.status(erro.statusCode).json({ erro: erro.message });
        return res.status(500).json({ erro: "Nao foi possivel consultar o dashboard." });
    }
}

module.exports = { consultar };
