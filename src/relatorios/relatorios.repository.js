const { QueryTypes } = require("sequelize");
const connection = require("../database/connection");

async function financeiro(inicio, fim, fusoHorario) {
    // Cada soma e independente: relacionar os registros das tres tabelas multiplicaria valores.
    // Uma unica consulta mantem os totais no mesmo retrato dos dados confirmados.
    const [totais] = await connection.query(`
        WITH periodo AS (
            SELECT CAST(:inicio AS DATE) AS inicio,
                   CAST(:fim AS DATE) AS fim,
                   CAST(:inicio AS TIMESTAMP) AT TIME ZONE :fusoHorario AS inicio_vendas,
                   (CAST(:fim AS DATE) + INTERVAL '1 day') AT TIME ZONE :fusoHorario AS fim_vendas
        )
        SELECT
            (SELECT CAST(COALESCE(SUM(v.valor_total), 0.00) AS TEXT)
             FROM venda v
             WHERE v.data_hora_venda >= p.inicio_vendas
               AND v.data_hora_venda < p.fim_vendas) AS total_receitas,
            (SELECT CAST(COALESCE(SUM(e.valor_total), 0.00) AS TEXT)
             FROM controle_estoque e
             WHERE e.data_compra >= p.inicio
               AND e.data_compra <= p.fim) AS total_compras_estoque,
            (SELECT CAST(COALESCE(SUM(d.valor), 0.00) AS TEXT)
             FROM despesa d
             WHERE d.data_pagamento >= p.inicio
               AND d.data_pagamento <= p.fim) AS total_despesas_operacionais
        FROM periodo p
    `, {
        replacements: { inicio, fim, fusoHorario },
        type: QueryTypes.SELECT,
    });
    return totais;
}

module.exports = { financeiro };
