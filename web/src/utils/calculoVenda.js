export const limiteQuantidade = 2147483647;
export const limiteTotal = 999999999999n;

// Calculos em centavos inteiros, seguindo o mesmo limite monetario da API.
export function centavos(valor) {
    if (!["string", "number"].includes(typeof valor) || !/^\d{1,10}(\.\d{1,2})?$/.test(String(valor))) return null;
    const [inteiros, decimais = ""] = String(valor).split(".");
    return BigInt(inteiros) * 100n + BigInt(decimais.padEnd(2, "0"));
}

export function reais(valor) {
    return `${valor / 100n}.${String(valor % 100n).padStart(2, "0")}`;
}

export function quantidadeValida(valor) {
    return /^\d+$/.test(String(valor)) && Number(valor) > 0 && Number(valor) <= limiteQuantidade;
}

export function totalPedido(itens) {
    return itens.reduce((total, item) => total + centavos(item.valor_unitario) * BigInt(item.quantidade), 0n);
}
