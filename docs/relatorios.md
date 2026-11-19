# Relatórios financeiros por período

O módulo atende ao RF09 com resumo e detalhamento de receitas, compras de estoque, despesas operacionais e resultado. A consulta usa os dados existentes, sem criar tabela ou gravar os totais no banco. Não é necessário executar novo SQL.

O módulo segue routes, controller, service e repository. Não precisa de um model próprio porque o relatório é calculado a partir de `venda`, `controle_estoque` e `despesa`.

## Acesso e consulta

Apenas administradores ativos autenticados podem acessar. Envie `Authorization: Bearer TOKEN_RECEBIDO_NO_LOGIN`.

```text
GET /relatorios/financeiro?inicio=2026-11-01&fim=2026-11-30
```

Os dois parâmetros são obrigatórios e devem ser datas existentes no formato AAAA-MM-DD. O fim deve ser igual ou posterior ao início. Datas iguais consultam um único dia. Parâmetros repetidos, desconhecidos, vazios ou com horário são recusados.

As datas inicial e final são inclusivas. As vendas são filtradas no fuso `America/Sao_Paulo`, da meia-noite do primeiro dia até antes da meia-noite seguinte ao último dia. Isso inclui todo o último dia sem depender do fuso configurado no computador, no Node.js ou na sessão do banco. Compras e despesas usam diretamente seus campos DATE.

O período é por dia de calendário: uma venda à 1h de 02/11 pertence ao dia 02/11. O horário operacional das 19h às 5h é usado somente pelo dashboard; este relatório mantém o período por dia de calendário.

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

Esta entrega inclui resumo e detalhamento dos lançamentos por período. Gráficos, agrupamentos adicionais e exportações não fazem parte desta etapa. O backend do dashboard está disponível separadamente em /dashboard, com a noite operacional das 19h às 5h; consulte [o guia do dashboard](dashboard.md).

Foram conferidos sintaxe, carregamento da aplicação e execução da consulta de leitura no PostgreSQL. Nenhum lançamento foi criado, alterado ou removido. Os testes automatizados continuam adiados; os cenários completos de valores, limites de datas e permissões ainda precisam de validação funcional.

## Detalhamento dos lançamentos (RF09)

```text
GET /relatorios/financeiro/detalhado?inicio=2026-11-01&fim=2026-11-30
Authorization: Bearer TOKEN_RECEBIDO_NO_LOGIN
```

Acesso exclusivo do administrador. Aceita os mesmos parâmetros obrigatórios, validações e respostas do resumo. Mantém os cinco totais e o objeto `periodo` no mesmo formato, acrescentando três listas:

| Lista | Dados de cada lançamento |
| --- | --- |
| vendas | id_venda, data_hora_venda, valor_total, usuario (id_usuario e nome_completo) |
| compras_estoque | id_estoque, data_compra, quantidade_adquirida, valor_total, produto (id_produto, nome_produto e tipo_produto) |
| despesas_operacionais | id_despesa, data_pagamento, tipo_despesa, valor, usuario (id_usuario e nome_completo) |

Exemplo ilustrativo com uma venda, uma compra e uma despesa:

```json
{
  "periodo": {"inicio": "2026-11-01", "fim": "2026-11-30", "fuso_horario": "America/Sao_Paulo"},
  "total_receitas": "100.00",
  "total_compras_estoque": "40.00",
  "total_despesas_operacionais": "10.00",
  "total_custos": "50.00",
  "resultado_periodo": "50.00",
  "vendas": [{
    "id_venda": 1, "data_hora_venda": "2026-11-15T22:00:00-03:00", "valor_total": "100.00",
    "usuario": {"id_usuario": 2, "nome_completo": "Funcionário Exemplo"}
  }],
  "compras_estoque": [{
    "id_estoque": 1, "data_compra": "2026-11-15", "quantidade_adquirida": 10, "valor_total": "40.00",
    "produto": {"id_produto": 1, "nome_produto": "Heineken 600ml", "tipo_produto": "bebida_alcoolica"}
  }],
  "despesas_operacionais": [{
    "id_despesa": 1, "data_pagamento": "2026-11-15", "tipo_despesa": "limpeza", "valor": "10.00",
    "usuario": {"id_usuario": 1, "nome_completo": "Administrador Exemplo"}
  }]
}
```

Cada lista é ordenada da data mais recente para a mais antiga, com ID decrescente como desempate. Sem lançamentos, as listas são `[]` e os totais `"0.00"`. Datas de compras e despesas usam AAAA-MM-DD; vendas têm data/hora com indicação de fuso. A interface deve exibi-las no horário de São Paulo.

As três listas vêm de uma única consulta SQL. Os totais são calculados a partir dessas mesmas listas, com centavos inteiros, evitando divergências internas se houver novos lançamentos durante a consulta. Consultas separadas ao resumo e ao detalhamento podem refletir momentos diferentes. Valores monetários permanecem strings com duas casas decimais.

Vendas aparecem uma vez por venda; seus itens podem ser consultados em `GET /vendas/:id`. Fichas já participam das receitas; reservas não geram receitas. Usuários inativos continuam identificando seus lançamentos históricos. Nomes de usuários, nomes e tipos de produtos são os dados atuais do cadastro; datas, quantidades e valores são os registrados no lançamento. Não são expostos CPF, email ou credenciais.

O endpoint retorna todos os lançamentos do período, sem paginação ou limite silencioso. Para a interface, prefira períodos delimitados; o resumo continua disponível quando só forem necessários os totais. A consulta não grava dados nem exige novo SQL de criação ou migração.

## Interface React

A tela `/relatorios` é exclusiva do administrador e usa somente `GET /relatorios/financeiro/detalhado`. O filtro inicial vai do primeiro dia do mês até hoje, no fuso de São Paulo. Datas inicial e final são inclusivas; o formulário valida datas existentes e ordem do período.

O resumo mostra receita, custos, resultado (inclusive prejuízo) e DRE simplificado. As três tabelas mostram todos os lançamentos retornados, preservando a ordenação da API. Totais e detalhamento vêm da mesma resposta, sem consultas independentes. Valores são formatados sem arredondar com ponto flutuante, inclusive resultados entre -1 e zero.

Alterar datas não muda o período exibido até clicar em Consultar período. A tela identifica o período efetivamente consultado. Novas consultas removem os dados anteriores durante o carregamento; falhas exibem erro com nova tentativa, nunca totais zero. A consulta é cancelada ao sair da página. Funcionários são redirecionados antes de carregar o conteúdo; a autorização da API permanece obrigatória.

Esta etapa inclui consulta, resumo e tabelas responsivas. Gráficos semanais, impressão e exportação do protótipo ficam para uma etapa posterior. Não houve alteração no backend ou no banco.
