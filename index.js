const connection = require("./src/database/connection");
const app = require("./src/app");
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

iniciar();
