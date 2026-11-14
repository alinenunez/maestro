const router = require("express").Router();
const controller = require("./mesas.controller");
const { requirePermissao, verificarAlteracaoMesa } = require("../auth/auth.config");
router.get("/", requirePermissao("CONSULTAR_MESAS"), controller.listar);
router.get("/:id", requirePermissao("CONSULTAR_MESAS"), controller.buscarPorId);
router.post("/", requirePermissao("GERENCIAR_MESAS"), controller.criar);
router.patch("/:id", requirePermissao("ATUALIZAR_STATUS_MESA"), verificarAlteracaoMesa, controller.atualizar);
router.delete("/:id", requirePermissao("GERENCIAR_MESAS"), controller.remover);
module.exports = router;
