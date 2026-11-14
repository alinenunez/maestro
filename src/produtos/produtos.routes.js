const router = require("express").Router();
const controller = require("./produtos.controller");
const { requirePermissao } = require("../auth/auth.config");
router.get("/", requirePermissao("CONSULTAR_PRODUTOS"), controller.listar);
router.get("/:id", requirePermissao("CONSULTAR_PRODUTOS"), controller.buscarPorId);
router.post("/", requirePermissao("GERENCIAR_PRODUTOS"), controller.criar);
router.patch("/:id", requirePermissao("GERENCIAR_PRODUTOS"), controller.atualizar);
router.delete("/:id", requirePermissao("GERENCIAR_PRODUTOS"), controller.remover);
module.exports = router;
