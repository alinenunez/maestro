const nodemailer = require("nodemailer");

let transporte;
const indisponivel = () => Object.assign(new Error("Recuperacao por email temporariamente indisponivel."), { statusCode: 503 });

function validarConfiguracao() {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT);
    const secure = process.env.SMTP_SECURE;
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASSWORD;
    const remetente = process.env.EMAIL_FROM?.trim();
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535 ||
        !["true", "false"].includes(secure) || !user || !pass?.trim() ||
        !remetente || remetente.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(remetente)) {
        throw indisponivel();
    }
    let url;
    try { url = new URL(process.env.RESET_PASSWORD_URL); } catch { throw indisponivel(); }
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password || url.search || url.hash) {
        throw indisponivel();
    }
    return { host, port, secure: secure === "true", user, pass, remetente, url };
}

function obterTransporte(config) {
    if (!transporte) {
        transporte = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            requireTLS: !config.secure,
            auth: { user: config.user, pass: config.pass },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 20000,
            dnsTimeout: 10000,
            disableFileAccess: true,
            disableUrlAccess: true,
            logger: false,
            debug: false,
        });
    }
    return transporte;
}

async function enviar(destinatario, assunto, texto, config) {
    const resultado = await obterTransporte(config).sendMail({
        from: { name: "Sistema Maestro", address: config.remetente },
        to: { address: destinatario },
        subject: assunto,
        text: texto,
    });
    if (!resultado.accepted?.length) throw new Error("Envio de email nao aceito pelo servidor.");
}

function enviarLinkRecuperacao(destinatario, token) {
    const config = validarConfiguracao();
    // O fragmento nao e enviado ao servidor web nem no cabecalho Referer.
    config.url.hash = new URLSearchParams({ token }).toString();
    return enviar(destinatario, "Redefinicao de senha - Sistema Maestro", [
        "Voce solicitou a redefinicao da sua senha no Sistema Maestro.",
        "Abra o link abaixo para escolher uma nova senha. Ele expira em 15 minutos:",
        config.url.toString(),
        "Se voce nao fez essa solicitacao, ignore esta mensagem. Sua senha continua a mesma.",
        "Nao compartilhe este link.",
    ].join("\n\n"), config);
}

function enviarAvisoSenhaAlterada(destinatario) {
    const config = validarConfiguracao();
    return enviar(destinatario, "Senha alterada - Sistema Maestro", [
        "A senha da sua conta no Sistema Maestro foi alterada.",
        "As sessoes anteriores foram invalidadas. Entre novamente com sua nova senha.",
        "Se voce nao reconhece essa alteracao, solicite uma nova recuperacao de senha ou procure o administrador.",
    ].join("\n\n"), config);
}

module.exports = { validarConfiguracao, enviarLinkRecuperacao, enviarAvisoSenhaAlterada };
