const router = require("express").Router();
const controller = require("./despesas.controller");
const { requirePermissao } = require("../auth/auth.config");

router.use(requirePermissao("GERENCIAR_DESPESAS"));
router.get("/", controller.listar);
router.get("/:id", controller.buscarPorId);
router.post("/", controller.criar);
router.patch("/:id", controller.atualizar);
router.delete("/:id", controller.remover);

module.exports = router;
