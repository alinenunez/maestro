const router = require("express").Router();
const controller = require("./vendas.controller");
const { requirePermissao } = require("../auth/auth.config");

router.get("/", requirePermissao("REGISTRAR_VENDAS"), controller.listar);
router.get("/:id", requirePermissao("REGISTRAR_VENDAS"), controller.buscarPorId);
router.post("/", requirePermissao("REGISTRAR_VENDAS"), controller.criar);

module.exports = router;
