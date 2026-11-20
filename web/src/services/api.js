export async function requisicao(caminho, { metodo = "GET", dados, token, signal, chaveCadastro } = {}) {
    let resposta;
    try {
        resposta = await fetch(`/api${caminho}`, {
            method: metodo,
            headers: {
                ...(dados ? { "Content-Type": "application/json" } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(chaveCadastro && caminho === "/auth/cadastro-inicial" ? { "X-Setup-Token": chaveCadastro } : {}),
            },
            body: dados ? JSON.stringify(dados) : undefined,
            signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
            cache: "no-store",
        });
    } catch (erro) {
        if (signal?.aborted) throw erro;
        throw new Error("Não foi possível conectar ao servidor. Tente novamente em instantes.");
    }
    if (resposta.status === 204) return null;
    const conteudo = await resposta.json().catch(() => null);
    if (!resposta.ok) {
        throw Object.assign(new Error(conteudo?.erro || "Não foi possível concluir a solicitação. Tente novamente."), { status: resposta.status });
    }
    if (!conteudo) throw new Error("O servidor retornou uma resposta inesperada. Tente novamente.");
    return conteudo;
}
