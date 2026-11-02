const express = require("express");
const connection = require("./database/connection");
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

module.exports = app;
