const router = require("express").Router();
const controller = require("./dashboard.controller");
const { requirePermissao } = require("../auth/auth.config");

router.get("/", requirePermissao("CONSULTAR_DASHBOARD"), controller.consultar);

module.exports = router;
