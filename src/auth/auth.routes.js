const router = require("express").Router();
const controller = require("./auth.controller");
const { requireLocalAuth, requireJWTAuth, limitarSolicitacaoRecuperacao, limitarRecuperacaoPorEmail, limitarRedefinicaoSenha, limitarCadastroAdministrador } = require("./auth.config");
router.post("/login", requireLocalAuth, controller.login);
router.get("/me", requireJWTAuth, controller.consultarSessao);
router.post("/cadastro-inicial", limitarCadastroAdministrador, controller.cadastrarAdministrador);
router.post("/recuperar-senha", limitarSolicitacaoRecuperacao, limitarRecuperacaoPorEmail, controller.solicitarRecuperacao);
router.post("/redefinir-senha", limitarRedefinicaoSenha, controller.redefinirSenha);
module.exports = router;
