import { paraCampo, exibirHorario } from "./horariosReserva";

const diaMs = 86400000;
const diaNumero = data => Math.floor(new Date(`${data}T00:00:00Z`).getTime() / diaMs);
const dataDia = numero => new Date(numero * diaMs).toISOString().slice(0, 10);
function centavos(valor) {
    const [inteiro, decimal = ""] = String(valor).split(".");
    return BigInt(inteiro) * 100n + BigInt(decimal.padEnd(2, "0"));
}
export function valorReais(valor) {
    return `${valor / 100n}.${String(valor % 100n).padStart(2, "0")}`;
}

export function agruparMovimentos(relatorio) {
    const inicio = diaNumero(relatorio.periodo.inicio), fim = diaNumero(relatorio.periodo.fim);
    // Até 12 faixas: semanas em períodos curtos, múltiplos de semanas nos mais longos.
    const diasPorFaixa = Math.max(7, Math.ceil((fim - inicio + 1) / 84) * 7);
    const faixas = Array.from({ length: Math.ceil((fim - inicio + 1) / diasPorFaixa) }, (_, indice) => ({
        inicio: dataDia(inicio + indice * diasPorFaixa), fim: dataDia(Math.min(fim, inicio + (indice + 1) * diasPorFaixa - 1)), receitas: 0n, custos: 0n,
    }));
    function somar(data, valor, campo) {
        const dia = diaNumero(data);
        if (dia < inicio || dia > fim) return;
        faixas[Math.floor((dia - inicio) / diasPorFaixa)][campo] += centavos(valor);
    }
    relatorio.vendas.forEach(v => somar(paraCampo(v.data_hora_venda).slice(0, 10), v.valor_total, "receitas"));
    relatorio.compras_estoque.forEach(c => somar(c.data_compra, c.valor_total, "custos"));
    relatorio.despesas_operacionais.forEach(d => somar(d.data_pagamento, d.valor, "custos"));
    return { diasPorFaixa, faixas };
}

// Apenas os valores monetários produzidos pelo sistema são tratados como números.
// Textos de cadastros são protegidos contra fórmulas ao abrir o CSV em planilhas.
function celula(valor, monetario) {
    let texto = String(valor ?? "");
    if (!(monetario && /^-?\d+,\d{2}$/.test(texto)) && /^[\s\uFEFF]*[=+\-@\t\r\n]/.test(texto)) texto = `'${texto}`;
    return `"${texto.replaceAll('"', '""')}"`;
}
export function gerarCsv(relatorio) {
    const linhas = [
        ["Sistema Maestro — Relatório financeiro", "", "", "", "", "", ""],
        ["Período", "", relatorio.periodo.inicio, `Até ${relatorio.periodo.fim} (inclusive); horário de São Paulo`, "", "", ""],
        ["Categoria", "ID", "Data", "Descrição", "Responsável", "Quantidade", "Valor (R$)"],
    ];
    const moeda = valor => String(valor).replace(".", ",");
    const resumo = { total_receitas: "Receita total", total_compras_estoque: "Compras de estoque", total_despesas_operacionais: "Despesas operacionais", total_custos: "Custos totais", resultado_periodo: "Resultado do período" };
    Object.entries(resumo).forEach(([campo, texto]) => linhas.push(["Resumo", "", "", texto, "", "", moeda(relatorio[campo])]));
    relatorio.vendas.forEach(v => linhas.push(["Venda", v.id_venda, exibirHorario(v.data_hora_venda), "Venda de produtos e fichas", v.usuario?.nome_completo || "", "", moeda(v.valor_total)]));
    relatorio.compras_estoque.forEach(c => linhas.push(["Compra de estoque", c.id_estoque, c.data_compra, c.produto?.nome_produto || "", "", c.quantidade_adquirida, moeda(c.valor_total)]));
    const tipos = { manutencao: "Manutenção", energia: "Energia", agua: "Água", limpeza: "Limpeza", outros: "Outros" };
    relatorio.despesas_operacionais.forEach(d => linhas.push(["Despesa", d.id_despesa, d.data_pagamento, tipos[d.tipo_despesa] || d.tipo_despesa, d.usuario?.nome_completo || "", "", moeda(d.valor)]));
    return "\uFEFF" + linhas.map(linha => linha.map((valor, indice) => celula(valor, indice === 6)).join(";")).join("\r\n") + "\r\n";
}

export function baixarRelatorio(relatorio) {
    const url = URL.createObjectURL(new Blob([gerarCsv(relatorio)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `maestro-financeiro-${relatorio.periodo.inicio}-a-${relatorio.periodo.fim}.csv`;
    document.body.appendChild(link);
    link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
