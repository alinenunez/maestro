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

async function financeiroDetalhado(inicio, fim, fusoHorario) {
    // Uma consulta fornece as tres listas no mesmo retrato dos dados confirmados.
    // Cada agregado e independente, sem multiplicar vendas por compras ou despesas.
    const [lancamentos] = await connection.query(`
        WITH periodo AS (
            SELECT CAST(:inicio AS DATE) AS inicio,
                   CAST(:fim AS DATE) AS fim,
                   CAST(:inicio AS TIMESTAMP) AT TIME ZONE :fusoHorario AS inicio_vendas,
                   (CAST(:fim AS DATE) + INTERVAL '1 day') AT TIME ZONE :fusoHorario AS fim_vendas
        )
        SELECT
            (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id_venda', v.id_venda,
                'data_hora_venda', v.data_hora_venda,
                'valor_total', CAST(v.valor_total AS TEXT),
                'usuario', jsonb_build_object('id_usuario', u.id_usuario, 'nome_completo', u.nome_completo)
             ) ORDER BY v.data_hora_venda DESC, v.id_venda DESC), '[]'::jsonb)
             FROM venda v
             JOIN usuario u ON u.id_usuario = v.id_usuario
             WHERE v.data_hora_venda >= p.inicio_vendas
               AND v.data_hora_venda < p.fim_vendas) AS vendas,
            (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id_estoque', e.id_estoque,
                'data_compra', e.data_compra,
                'quantidade_adquirida', e.quantidade_adquirida,
                'valor_total', CAST(e.valor_total AS TEXT),
                'produto', jsonb_build_object('id_produto', pr.id_produto,
                    'nome_produto', pr.nome_produto, 'tipo_produto', pr.tipo_produto)
             ) ORDER BY e.data_compra DESC, e.id_estoque DESC), '[]'::jsonb)
             FROM controle_estoque e
             JOIN produtos pr ON pr.id_produto = e.id_produto
             WHERE e.data_compra >= p.inicio
               AND e.data_compra <= p.fim) AS compras_estoque,
            (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id_despesa', d.id_despesa,
                'data_pagamento', d.data_pagamento,
                'tipo_despesa', d.tipo_despesa,
                'valor', CAST(d.valor AS TEXT),
                'usuario', jsonb_build_object('id_usuario', u.id_usuario, 'nome_completo', u.nome_completo)
             ) ORDER BY d.data_pagamento DESC, d.id_despesa DESC), '[]'::jsonb)
             FROM despesa d
             JOIN usuario u ON u.id_usuario = d.id_usuario
             WHERE d.data_pagamento >= p.inicio
               AND d.data_pagamento <= p.fim) AS despesas_operacionais
        FROM periodo p
    `, {
        replacements: { inicio, fim, fusoHorario },
        type: QueryTypes.SELECT,
    });
    return lancamentos;
}

module.exports = { financeiro, financeiroDetalhado };
