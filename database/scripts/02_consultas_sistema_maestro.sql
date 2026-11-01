-- Consultas auxiliares: execute separadamente apos criar as tabelas.
SET TIME ZONE 'America/Sao_Paulo';

-- Conferir tabelas.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Agenda por mesa.
SELECT m.numero_mesa, r.id_reserva, r.nome_cliente,
       r.data_horario_reserva AS inicio_previsto,
       r.data_horario_reserva + r.duracao_minutos * INTERVAL '1 minute' AS fim_previsto
FROM reserva_mesa r
JOIN reserva_mesa_item ri ON ri.id_reserva = r.id_reserva
JOIN mesa_sinuca m ON m.id_mesa = ri.id_mesa
ORDER BY r.data_horario_reserva, m.numero_mesa;

-- Disponibilidade em um periodo: substitua as datas abaixo.
-- Intervalos adjacentes sao permitidos: uma reserva pode iniciar quando outra termina.
WITH periodo AS (
    SELECT TIMESTAMPTZ '2026-11-01 20:00:00-03' AS inicio,
           TIMESTAMPTZ '2026-11-01 21:00:00-03' AS fim
)
SELECT m.id_mesa, m.numero_mesa, m.status AS status_atual,
       CASE WHEN m.status = 'manutencao' THEN 'manutencao'
            WHEN EXISTS (
                SELECT 1
                FROM reserva_mesa_item ri
                JOIN reserva_mesa r ON r.id_reserva = ri.id_reserva
                WHERE ri.id_mesa = m.id_mesa
                  AND r.data_horario_reserva < p.fim
                  AND r.data_horario_reserva + r.duracao_minutos * INTERVAL '1 minute' > p.inicio
            ) THEN 'reservada'
            ELSE 'sem reserva'
       END AS disponibilidade
FROM mesa_sinuca m CROSS JOIN periodo p
WHERE p.fim > p.inicio
ORDER BY m.numero_mesa;

