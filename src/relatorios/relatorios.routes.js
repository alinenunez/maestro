const router = require("express").Router();
const controller = require("./relatorios.controller");
const { requirePermissao } = require("../auth/auth.config");

router.get("/financeiro", requirePermissao("CONSULTAR_RELATORIOS"), controller.financeiro);

module.exports = router;
