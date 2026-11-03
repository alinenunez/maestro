const router = require("express").Router();
const controller = require("./produtos.controller");
router.get("/", controller.listar);
router.get("/:id", controller.buscarPorId);
router.post("/", controller.criar);
router.patch("/:id", controller.atualizar);
router.delete("/:id", controller.remover);
module.exports = router;
