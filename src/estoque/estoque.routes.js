const router = require("express").Router();
const controller = require("./estoque.controller");
const { requirePermissao } = require("../auth/auth.config");

router.get("/", requirePermissao("GERENCIAR_ESTOQUE"), controller.listar);
router.get("/:id", requirePermissao("GERENCIAR_ESTOQUE"), controller.buscarPorId);
router.post("/", requirePermissao("GERENCIAR_ESTOQUE"), controller.criar);

module.exports = router;
