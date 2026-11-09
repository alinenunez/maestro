const connection = require("./src/database/connection");
const express = require("express");

const app = express();
app.use(express.json());

app.get("/health", async (req, res) => {
    try {
        await connection.authenticate();
        return res.status(200).json({ status: "ok", banco: "conectado" });
    } catch {
        return res.status(503).json({ status: "indisponivel", banco: "desconectado" });
    }
});

app.use("/mesas", require("./src/mesas/mesas.routes"));
app.use("/produtos", require("./src/produtos/produtos.routes"));
app.use("/usuarios", require("./src/usuarios/usuarios.routes"));
const port = Number(process.env.PORT || 3000);

async function iniciar() {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        console.error("PORT deve ser um numero entre 1 e 65535.");
        process.exitCode = 1;
        await connection.close();
        return;
    }
    try {
        await connection.authenticate();
        console.log("Conexao com PostgreSQL estabelecida.");
    } catch {
        console.error("Nao foi possivel conectar ao PostgreSQL. Confira o servico e as configuracoes do .env.");
        process.exitCode = 1;
        await connection.close();
        return;
    }
    const server = app.listen(port, "127.0.0.1", () => {
        console.log(`Maestro: http://localhost:${port}/health`);
    });
    server.on("error", async () => {
        console.error("Nao foi possivel iniciar o servidor. Confira se a porta esta disponivel.");
        process.exitCode = 1;
        await connection.close();
    });
    const encerrar = () => server.close(async () => {
        await connection.close();
    });
    process.once("SIGINT", encerrar);
    process.once("SIGTERM", encerrar);
}

// Inicia apenas quando executado diretamente; permite importar a aplicação nos testes.
if (require.main === module) {
    iniciar();
}

module.exports = app;
