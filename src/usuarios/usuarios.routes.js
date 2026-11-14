const router = require("express").Router();
const controller = require("./usuarios.controller");
const { requirePermissao } = require("../auth/auth.config");
// Retorna somente ID e nome para selecionar o responsavel pela futura venda.
router.get("/responsaveis", requirePermissao("REGISTRAR_VENDAS"), controller.listarResponsaveis);
router.get("/", requirePermissao("GERENCIAR_USUARIOS"), controller.listar);
router.get("/:id", requirePermissao("GERENCIAR_USUARIOS"), controller.buscarPorId);
router.post("/", requirePermissao("GERENCIAR_USUARIOS"), controller.criar);
router.patch("/:id", requirePermissao("GERENCIAR_USUARIOS"), controller.atualizar);
module.exports = router;
