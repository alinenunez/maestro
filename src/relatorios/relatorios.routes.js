const router = require("express").Router();
const controller = require("./relatorios.controller");
const { requirePermissao } = require("../auth/auth.config");

router.get("/financeiro", requirePermissao("CONSULTAR_RELATORIOS"), controller.financeiro);

router.get("/financeiro/detalhado", requirePermissao("CONSULTAR_RELATORIOS"), controller.financeiroDetalhado);

module.exports = router;
