const { QueryTypes } = require("sequelize");
const connection = require("../database/connection");

async function consultar({ fusoHorario, inicioNoite, fimNoite, nomesCervejas }) {
    // Todos os indicadores usam o mesmo instante e o mesmo retrato dos dados confirmados.
    const [resumo] = await connection.query(`
        WITH referencia AS (
            SELECT CURRENT_TIMESTAMP AS agora,
                   CURRENT_TIMESTAMP AT TIME ZONE :fusoHorario AS horario_local,
                   CAST(:inicioNoite AS TIME) AS hora_inicio,
                   CAST(:fimNoite AS TIME) AS hora_fim
        ), noite AS (
            SELECT agora, hora_inicio, hora_fim,
                   CASE WHEN CAST(horario_local AS TIME) >= hora_inicio
                        THEN CAST(horario_local AS DATE)
                        ELSE CAST(horario_local AS DATE) - 1 END AS data_noite,
                   CASE WHEN hora_fim <= hora_inicio THEN 1 ELSE 0 END AS dias_ate_fim
            FROM referencia
        ), periodo AS (
            SELECT agora, data_noite,
                   (data_noite + hora_inicio) AT TIME ZONE :fusoHorario AS inicio_atual,
                   (data_noite + dias_ate_fim + hora_fim) AT TIME ZONE :fusoHorario AS fim_atual,
                   (data_noite - 1 + hora_inicio) AT TIME ZONE :fusoHorario AS inicio_anterior,
                   (data_noite - 1 + dias_ate_fim + hora_fim) AT TIME ZONE :fusoHorario AS fim_anterior
            FROM noite
        ), situacao_mesas AS (
            SELECT m.id_mesa, m.status,
                   EXISTS (
                       SELECT 1 FROM reserva_mesa_item ri
                       JOIN reserva_mesa r ON r.id_reserva = ri.id_reserva
                       WHERE ri.id_mesa = m.id_mesa
                         AND r.data_horario_reserva <= p.agora
                         AND r.data_horario_reserva + r.duracao_minutos * INTERVAL '1 minute' > p.agora
                   ) AS reservada
            FROM mesa_sinuca m CROSS JOIN periodo p
        ), totais_mesas AS (
            SELECT COUNT(*) AS total_mesas,
                   COUNT(*) FILTER (WHERE status = 'disponivel') AS mesas_disponiveis,
                   COUNT(*) FILTER (WHERE status = 'ocupada') AS mesas_ocupadas,
                   COUNT(*) FILTER (WHERE status = 'manutencao') AS mesas_manutencao,
                   COUNT(*) FILTER (WHERE reservada) AS mesas_reservadas,
                   COUNT(*) FILTER (WHERE status = 'disponivel' AND NOT reservada) AS mesas_livres
            FROM situacao_mesas
        ), estoque AS (
            SELECT COALESCE(SUM(quantidade_produto), 0) AS cervejas_disponiveis
            FROM produtos
            WHERE tipo_produto IN ('bebida_alcoolica', 'bebida_nao_alcoolica')
              AND EXISTS (
                  SELECT 1
                  FROM UNNEST(CAST(ARRAY[:nomesCervejas] AS TEXT[])) AS marcas(nome)
                  WHERE LOWER(BTRIM(nome_produto)) = marcas.nome
                     OR LEFT(LOWER(BTRIM(nome_produto)), LENGTH(marcas.nome) + 1) = marcas.nome || ' '
              )
        ), vendas_atual AS (
            SELECT COUNT(*) AS quantidade_atual, COALESCE(SUM(v.valor_total), 0.00) AS total_atual
            FROM venda v CROSS JOIN periodo p
            WHERE v.data_hora_venda >= p.inicio_atual
              AND v.data_hora_venda < p.fim_atual
              AND v.data_hora_venda <= p.agora
        ), vendas_anterior AS (
            SELECT COUNT(*) AS quantidade_anterior, COALESCE(SUM(v.valor_total), 0.00) AS total_anterior
            FROM venda v CROSS JOIN periodo p
            WHERE v.data_hora_venda >= p.inicio_anterior
              AND v.data_hora_venda < p.fim_anterior
        )
        SELECT p.agora, CAST(p.data_noite AS TEXT) AS data_noite,
               p.inicio_atual, p.fim_atual, p.inicio_anterior, p.fim_anterior,
               (p.agora >= p.inicio_atual AND p.agora < p.fim_atual) AS noite_em_andamento,
               m.*, e.cervejas_disponiveis,
               a.quantidade_atual, CAST(a.total_atual AS TEXT) AS total_atual,
               b.quantidade_anterior, CAST(b.total_anterior AS TEXT) AS total_anterior
        FROM periodo p
        CROSS JOIN totais_mesas m
        CROSS JOIN estoque e
        CROSS JOIN vendas_atual a
        CROSS JOIN vendas_anterior b
    `, {
        replacements: {
            fusoHorario,
            inicioNoite,
            fimNoite,
            nomesCervejas: nomesCervejas.length ? nomesCervejas : [null],
        },
        type: QueryTypes.SELECT,
    });
    return resumo;
}

module.exports = { consultar };
