// Formata a parte inteira com BigInt para nao arredondar totais monetarios grandes.
export function dinheiro(valor) {
    const texto = String(valor);
    const negativo = texto.startsWith("-");
    const [inteiros, centavos = "00"] = (negativo ? texto.slice(1) : texto).split(".");
    return `${negativo ? "−" : ""}R$ ${BigInt(inteiros).toLocaleString("pt-BR")},${centavos.padEnd(2, "0")}`;
}
export function numero(valor) {
    return Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
export function horario(valor, fuso) {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(valor));
}
export function dataNoite(valor) {
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
}
