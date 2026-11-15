# Resumo financeiro por período

Esta é a primeira etapa dos relatórios financeiros do RF09: um resumo de receitas, compras de estoque, despesas operacionais e resultado. A consulta usa os dados existentes, sem criar tabela ou gravar os totais no banco. Não é necessário executar novo SQL.

O módulo segue routes, controller, service e repository. Não precisa de um model próprio porque o relatório é calculado a partir de `venda`, `controle_estoque` e `despesa`.

## Acesso e consulta

Apenas administradores ativos autenticados podem acessar. Envie `Authorization: Bearer TOKEN_RECEBIDO_NO_LOGIN`.

```text
GET /relatorios/financeiro?inicio=2026-11-01&fim=2026-11-30
```

Os dois parâmetros são obrigatórios e devem ser datas existentes no formato AAAA-MM-DD. O fim deve ser igual ou posterior ao início. Datas iguais consultam um único dia. Parâmetros repetidos, desconhecidos, vazios ou com horário são recusados.

As datas inicial e final são inclusivas. As vendas são filtradas no fuso `America/Sao_Paulo`, da meia-noite do primeiro dia até antes da meia-noite seguinte ao último dia. Isso inclui todo o último dia sem depender do fuso configurado no computador, no Node.js ou na sessão do banco. Compras e despesas usam diretamente seus campos DATE.

O período é por dia de calendário: uma venda à 1h de 02/11 pertence ao dia 02/11. Não foi definido um horário de fechamento para agrupar a madrugada à noite anterior.

## Origem dos valores

| Campo da resposta | Cálculo |
| --- | --- |
| total_receitas | Soma de venda.valor_total pela data_hora_venda no período |
| total_compras_estoque | Soma de controle_estoque.valor_total pela data_compra no período |
| total_despesas_operacionais | Soma de despesa.valor pela data_pagamento no período |
| total_custos | Compras de estoque + despesas operacionais |
| resultado_periodo | Receitas − total de custos |

O resultado segue a fórmula definida no RF09. Valores positivos indicam receitas superiores aos custos; negativos indicam custos superiores às receitas. Nenhum resultado negativo é substituído por zero.

As três somas são feitas separadamente em uma única consulta SQL. Não são relacionados itens de venda às compras ou despesas, evitando multiplicação de valores. As vendas de fichas já estão incluídas nos totais das vendas, e reservas não participam desse cálculo.

O cálculo usa os totais gravados em cada venda, preservando os preços praticados. O preço atual de um produto, seu saldo atual e a quantidade cadastrada inicialmente não são usados para estimar receita ou custo.

O banco soma valores NUMERIC. O service calcula custos e resultado em centavos inteiros com BigInt, sem perda de precisão em totais grandes. Os cinco valores monetários são devolvidos como strings com duas casas decimais, em reais, sem símbolo de moeda. A interface será responsável por exibir o formato brasileiro.

## Exemplo de resposta

Exemplo ilustrativo; os valores reais dependem dos registros existentes:

```json
{
  "periodo": {
    "inicio": "2026-11-01",
    "fim": "2026-11-30",
    "fuso_horario": "America/Sao_Paulo"
  },
  "total_receitas": "1000.00",
  "total_compras_estoque": "200.00",
  "total_despesas_operacionais": "100.00",
  "total_custos": "300.00",
  "resultado_periodo": "700.00"
}
```

Sem movimentações no período, a resposta mantém essa estrutura, com os valores monetários em `"0.00"`. Se houver somente custos, o resultado será negativo. Falhas de consulta retornam erro; não são apresentadas como totais zero.

Compras registradas em `controle_estoque` não devem ser cadastradas novamente como despesas operacionais. O relatório soma os registros existentes e não consegue reconhecer que dois lançamentos manuais distintos representam o mesmo custo.

## Respostas e limites desta etapa

- `200`: resumo calculado, inclusive quando não há movimentações.
- `400`: período ausente, inválido, invertido ou parâmetros não permitidos.
- `401`: autenticação ausente ou inválida, incluindo usuário inativo.
- `403`: usuário autenticado sem perfil de administrador.
- `500`: falha no cálculo ou consulta, sem expor detalhes internos. A autenticação mantém `503` se não conseguir consultar o banco.

Esta entrega inclui o resumo por período. Detalhamento dos lançamentos, agrupamentos, gráficos, exportações e dashboard ficam para etapas posteriores.

Foram conferidos sintaxe, carregamento da aplicação e execução da consulta de leitura no PostgreSQL. Nenhum lançamento foi criado, alterado ou removido. Os testes automatizados continuam adiados; os cenários completos de valores, limites de datas e permissões ainda precisam de validação funcional.
