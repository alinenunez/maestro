const router = require("express").Router();
const controller = require("./usuarios.controller");
router.get("/", controller.listar);
router.get("/:id", controller.buscarPorId);
router.post("/", controller.criar);
router.patch("/:id", controller.atualizar);
module.exports = router;
