const router = require("express").Router();
const controller = require("./auth.controller");
const { requireLocalAuth, requireJWTAuth, limitarSolicitacaoRecuperacao, limitarRecuperacaoPorEmail, limitarRedefinicaoSenha } = require("./auth.config");
router.post("/login", requireLocalAuth, controller.login);
router.get("/me", requireJWTAuth, controller.consultarSessao);
router.post("/cadastro-inicial", controller.cadastrarAdministradorInicial);
router.post("/recuperar-senha", limitarSolicitacaoRecuperacao, limitarRecuperacaoPorEmail, controller.solicitarRecuperacao);
router.post("/redefinir-senha", limitarRedefinicaoSenha, controller.redefinirSenha);
module.exports = router;
