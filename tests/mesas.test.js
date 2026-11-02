const { test } = require("node:test");
const assert = require("node:assert/strict");
const repository = require("../src/mesas/mesas.repository");
const connection = require("../src/database/connection");
const app = require("../index");

test("API de mesas: validacao, CRUD e conflitos", async () => {
    let mesa = null;
    repository.listar = async () => mesa ? [mesa] : [];
    repository.buscarPorId = async id => mesa?.id_mesa === id ? mesa : null;
    repository.criar = async dados => {
        if (mesa) throw Object.assign(new Error(), { name: "SequelizeUniqueConstraintError" });
        return mesa = { id_mesa: 1, status: "disponivel", ...dados };
    };
    repository.atualizar = async (id, dados) => mesa?.id_mesa === id ? (mesa = { ...mesa, ...dados }) : null;
    repository.remover = async () => { throw Object.assign(new Error(), { name: "SequelizeForeignKeyConstraintError" }); };
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const url = `http://127.0.0.1:${server.address().port}/mesas`;
    const request = (method, path = "", body) => fetch(url + path, {
        method, headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    try {
        assert.deepEqual(await (await request("GET")).json(), []);
        for (const body of [{}, [], { numero_mesa: 0 }, { numero_mesa: "1" }, { numero_mesa: 1, status: "livre" }, { numero_mesa: 1, id_mesa: 2 }]) {
            assert.equal((await request("POST", "", body)).status, 400);
        }
        assert.equal((await request("GET", "/abc")).status, 400);
        assert.equal((await request("GET", "/1")).status, 404);
        let response = await request("POST", "", { numero_mesa: 1 });
        assert.equal(response.status, 201);
        assert.equal(response.headers.get("location"), "/mesas/1");
        assert.equal((await response.json()).status, "disponivel");
        assert.equal((await request("POST", "", { numero_mesa: 1 })).status, 409);
        response = await request("PATCH", "/1", { status: "ocupada" });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).status, "ocupada");
        assert.equal((await request("PATCH", "/2", { status: "manutencao" })).status, 404);
        assert.equal((await request("DELETE", "/1")).status, 409);
        repository.remover = async id => { if (mesa?.id_mesa !== id) return 0; mesa = null; return 1; };
        assert.equal((await request("DELETE", "/1")).status, 204);
        assert.equal((await request("DELETE", "/1")).status, 404);
    } finally {
        await new Promise(resolve => server.close(resolve));
        await connection.close();
    }
});
