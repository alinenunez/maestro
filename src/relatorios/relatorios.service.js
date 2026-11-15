const repository = require("./relatorios.repository");

const falha = (mensagem, statusCode = 400) => Object.assign(new Error(mensagem), { statusCode });
const fusoHorario = "America/Sao_Paulo";

function validarData(valor, campo) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith("0000")) {
        throw falha(`${campo} deve estar no formato AAAA-MM-DD.`);
    }
    const data = new Date(`${valor}T00:00:00Z`);
    if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
        throw falha(`${campo} deve ser uma data valida.`);
    }
    return valor;
}

function validarPeriodo(filtros) {
    if (Object.keys(filtros).some(campo => !["inicio", "fim"].includes(campo))) {
        throw falha("Filtros permitidos: inicio e fim.");
    }
    const inicio = validarData(filtros.inicio, "inicio");
    const fim = validarData(filtros.fim, "fim");
    if (fim < inicio) throw falha("fim deve ser igual ou posterior a inicio.");
    return { inicio, fim };
}

function emCentavos(valor) {
    if (typeof valor !== "string" || !/^\d+(\.\d{1,2})?$/.test(valor)) {
        throw new Error("O banco retornou um total financeiro invalido.");
    }
    const [inteiros, decimais = ""] = valor.split(".");
    return BigInt(inteiros) * 100n + BigInt(decimais.padEnd(2, "0"));
}

function emReais(centavos) {
    const sinal = centavos < 0n ? "-" : "";
    const valor = centavos < 0n ? -centavos : centavos;
    return `${sinal}${valor / 100n}.${String(valor % 100n).padStart(2, "0")}`;
}

function montarResumo(inicio, fim, receitas, compras, despesas) {
    const custos = compras + despesas;
    return {
        periodo: { inicio, fim, fuso_horario: fusoHorario },
        total_receitas: emReais(receitas),
        total_compras_estoque: emReais(compras),
        total_despesas_operacionais: emReais(despesas),
        total_custos: emReais(custos),
        resultado_periodo: emReais(receitas - custos),
    };
}

async function financeiro(filtros = {}) {
    const { inicio, fim } = validarPeriodo(filtros);
    const totais = await repository.financeiro(inicio, fim, fusoHorario);
    return montarResumo(inicio, fim, emCentavos(totais.total_receitas),
        emCentavos(totais.total_compras_estoque), emCentavos(totais.total_despesas_operacionais));
}

async function financeiroDetalhado(filtros = {}) {
    const { inicio, fim } = validarPeriodo(filtros);
    const lancamentos = await repository.financeiroDetalhado(inicio, fim, fusoHorario);
    // Os totais correspondem exatamente as listas retornadas, mesmo durante novos registros.
    // BigInt evita arredondamentos de ponto flutuante e suporta totais grandes.
    const somar = (lista, campo) => lista.reduce((total, item) => total + emCentavos(item[campo]), 0n);
    const receitas = somar(lancamentos.vendas, "valor_total");
    const compras = somar(lancamentos.compras_estoque, "valor_total");
    const despesas = somar(lancamentos.despesas_operacionais, "valor");
    return { ...montarResumo(inicio, fim, receitas, compras, despesas), ...lancamentos };
}

module.exports = { financeiro, financeiroDetalhado };
