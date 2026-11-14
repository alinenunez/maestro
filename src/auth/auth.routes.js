const router = require("express").Router();
const controller = require("./auth.controller");
const { requireLocalAuth, requireJWTAuth } = require("./auth.config");
router.post("/login", requireLocalAuth, controller.login);
router.get("/me", requireJWTAuth, controller.consultarSessao);
router.post("/cadastro-inicial", controller.cadastrarAdministradorInicial);
module.exports = router;
