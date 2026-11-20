# Dashboard

O módulo fornece os indicadores do RF10 por `GET /dashboard`. Administrador e funcionário ativos podem consultar, enviando `Authorization: Bearer TOKEN_RECEBIDO_NO_LOGIN`.

A tela React em /dashboard consulta esta API. Não foram criados registros, tabelas ou colunas. Não é necessário executar novo SQL.

## Consulta

```text
GET /dashboard
```

A rota mostra o momento atual e não aceita parâmetros de consulta. Cada chamada faz uma nova leitura do banco, reunindo os indicadores em uma única consulta para usar o mesmo instante e os mesmos dados confirmados. A resposta inclui `atualizado_em` e `fuso_horario` e solicita que o cliente não armazene a resposta em cache.

A interface consulta a API ao abrir, a cada minuto enquanto estiver visível e quando a aba receber foco. Também possui o botão Atualizar. Não há conexão permanente: os números refletem a última consulta.

## Identificação das cervejas pelo nome

Conforme a decisão do projeto, os produtos mantêm seus nomes. A lista de marcas de cerveja fica em `src/dashboard/dashboard.config.js`, no campo `nomesCervejas`. Essa configuração não contém segredos e pode ser versionada normalmente.

Lista inicial configurada: **Heineken, Brahma, Polar, Glacial, Budweiser e Patricia**.

A comparação reconhece a marca no início do nome, sozinha ou seguida de espaço e detalhes, sem diferenciar maiúsculas e minúsculas e ignorando espaços nas extremidades. Com `Heineken` na lista, entram `HEINEKEN`, `Heineken 600ml`, `Heineken long neck` e `Heineken Zero`. Cada apresentação pode continuar como um produto separado, com seu próprio preço e estoque; não é necessário listar cada variação. Nomes como `HeinekenX` ou `Combo com Heineken` não correspondem à regra. Cada produto é somado uma única vez, mesmo que corresponda a mais de uma entrada da lista.

Só são consideradas bebidas dos tipos `bebida_alcoolica` e `bebida_nao_alcoolica`. Assim, uma cerveja sem álcool também entra quando seu nome começa com uma marca configurada. Fichas e guloseimas não entram no indicador.

`estoque.cervejas_disponiveis` soma `quantidade_produto` dos produtos identificados. Não representa quantidade de marcas nem quantidade vendida. Novas marcas exigem atualizar a lista e reiniciar o servidor, salvo reinício automático do modo de desenvolvimento. Alterar apenas os detalhes depois da marca não exige mudar a configuração.

Se a lista estiver vazia, a API retorna `lista_cervejas_configurada: false` e `cervejas_disponiveis: null`. Com uma lista preenchida e nenhum produto correspondente no estoque, retorna true e zero, respectivamente. Não há renomeação nem cadastro automático de produtos.

## Mesas e reservas

| Campo em mesas | Significado |
| --- | --- |
| total | Quantidade de mesas cadastradas |
| disponiveis | Mesas com status atual disponivel |
| ocupadas | Mesas com status atual ocupada |
| manutencao | Mesas com status atual manutencao |
| reservadas_agora | Mesas distintas vinculadas a reservas cujo intervalo inclui o momento da consulta |
| livres_agora | Mesas com status disponivel e sem reserva vigente no momento |

Uma reserva de três mesas conta três mesas reservadas. Uma mesma mesa é contada uma vez, mesmo se houver reservas sobrepostas inseridas diretamente no banco. O início da reserva é inclusivo e o fim é exclusivo; reservas futuras e encerradas não entram em `reservadas_agora`.

Os três status atuais somam o total de mesas. As reservas são uma informação independente: uma mesa ocupada também pode ter uma reserva vigente. A contagem não altera automaticamente o status, que continua sendo atualizado pelo atendente. Os indicadores de mesas usam o instante atual mesmo fora do horário da noite de vendas.

## Noite de vendas: das 19h às 5h

Os horários definidos são `19:00` para início e `05:00` do dia seguinte para encerramento, no fuso `America/Sao_Paulo`. Eles ficam no mesmo arquivo de configuração.

- Das 19h até antes das 5h, o dashboard mostra a noite em andamento.
- A madrugada pertence à noite iniciada no dia anterior. À 1h de 15/11, por exemplo, a noite é a de 14/11, iniciada às 19h e encerrada às 5h de 15/11.
- Entre 5h e 19h, mostra a última noite encerrada, com `noite_em_andamento: false`.
- Às 19h começa o novo período. Uma venda exatamente às 19h é incluída; uma venda exatamente às 5h fica fora da noite que terminou.
- Vendas feitas entre 5h e 19h continuam registradas e aparecem nos relatórios financeiros por dia de calendário, mas não entram nos indicadores noturnos do dashboard.

`vendas.quantidade` conta vendas registradas, e `vendas.total` soma `venda.valor_total` no intervalo, até o momento da consulta. O total inclui fichas, bebidas e guloseimas, sem recalcular preços atuais ou somar os itens novamente.

A noite anterior é o intervalo das 19h às 5h iniciado um dia antes da noite mostrada. Não há calendário de dias de funcionamento, nem busca automática do último dia com vendas. Os horários da resposta são instantes em UTC; a interface deverá exibi-los no fuso informado.

## Meta

A meta é igual ao total vendido na noite anterior, sem acréscimo percentual. `meta.valor` guarda essa referência, `progresso_percentual` informa quanto já foi atingido e `atingida` compara os dois valores.

Por exemplo, vendas anteriores de R$ 1.000,00 e vendas atuais de R$ 750,00 produzem meta `"1000.00"`, progresso `"75.00"` e `atingida: false`. O progresso pode ultrapassar 100%.

Se o total anterior for zero, `meta.disponivel` será false e valor, progresso e atingida serão null. Isso evita divisão por zero e evita indicar uma meta atingida sem uma referência positiva.

Valores monetários e percentuais são strings com duas casas decimais. O cálculo usa centavos inteiros com BigInt. Contagens são números inteiros. O dashboard não revela despesas, custos, lucro, dados pessoais de clientes ou credenciais; mostra somente o nome do responsável nos itens vendidos; o resumo financeiro permanece exclusivo do administrador.

## Exemplo de estrutura

Exemplo ilustrativo, com lista de cervejas configurada e uma noite em andamento:

```json
{
  "atualizado_em": "2026-11-15T01:00:00.000Z",
  "fuso_horario": "America/Sao_Paulo",
  "estoque": { "lista_cervejas_configurada": true, "cervejas_disponiveis": 48 },
  "mesas": {
    "total": 5,
    "disponiveis": 3,
    "ocupadas": 1,
    "manutencao": 1,
    "reservadas_agora": 2,
    "livres_agora": 2
  },
  "vendas": {
    "data_noite": "2026-11-14",
    "inicio": "2026-11-14T22:00:00.000Z",
    "fim": "2026-11-15T08:00:00.000Z",
    "noite_em_andamento": true,
    "quantidade": 15,
    "total": "750.00",
    "noite_anterior": {
      "inicio": "2026-11-13T22:00:00.000Z",
      "fim": "2026-11-14T08:00:00.000Z",
      "quantidade": 20,
      "total": "1000.00"
    }
  },
  "meta": { "disponivel": true, "valor": "1000.00", "progresso_percentual": "75.00", "atingida": false }
}
```

## Respostas e conferência

- `200`: indicadores consultados, inclusive quando não há movimentações ou mesas cadastradas.
- `400`: envio de parâmetros de consulta não suportados.
- `401`: autenticação ausente, inválida ou usuário inativo; `403`: perfil sem permissão.
- `500`: falha na consulta ou cálculo, sem expor detalhes do banco e sem simular totais zero. A autenticação mantém `503` se não conseguir consultar o banco.

Conferências desta etapa: sintaxe, carregamento da aplicação e execução da consulta somente de leitura no PostgreSQL. Nenhum produto, venda ou reserva foi alterado. Os testes automatizados continuam adiados; os cenários completos de horários, contagens, meta e permissões ainda precisam de validação funcional.

## Blocos do protótipo e interface React

O login agora abre /dashboard. /inicio redireciona para essa tela. Administrador e funcionário veem os indicadores, seu nome/perfil e Sair. A navegação é adaptada por perfil: funcionários acessam Dashboard, Produtos (consulta), Estoque, Vendas e Reservas. Funcionários, Despesas e Relatórios são exclusivos do administrador. Todas essas telas estão implementadas; a escrita de produtos e o gerenciamento de mesas também são exclusivos do administrador. Isso não substitui a autorização da API.

A tela inclui carregamento inicial, listas vazias, meta indisponível, nenhum cadastro de mesa e erros. Uma falha de atualização preserva os últimos dados, com aviso explícito de que estão desatualizados. Uma resposta 401 encerra a sessão. Requisições em andamento são canceladas ao sair da tela e atualizações não se sobrepõem.

O percentual pode ultrapassar 100%; a barra visual para em 100%. Quando não há vendas na noite anterior, aparece Sem meta. Mesas reservadas, livres, ocupadas e em manutenção são mostradas separadamente; reservas não são somadas aos status, pois podem se sobrepor. As datas e horas são exibidas em America/Sao_Paulo.

Novos campos da mesma resposta GET /dashboard:

- `ultimas_vendas`: até cinco itens da noite selecionada, ordenados por horário e ID de venda decrescentes, depois ID de produto crescente. Cada item contém id_venda, data_hora_venda, id_produto, nome_produto, quantidade, subtotal e nome_responsavel. Uma venda com vários produtos pode ocupar mais de uma linha. O subtotal usa o preço histórico de item_venda, não o preço atual. As vendas de fichas também aparecem. Uma lista vazia retorna [].
- `estoque.limite_baixo`: limite inclusivo configurado em src/dashboard/dashboard.config.js, definido em 10 unidades conforme a escolha do projeto.
- `estoque.produtos_baixos`: todos os produtos físicos com saldo menor ou igual ao limite, incluindo saldo zero, excluindo ficha_sinuca. Contém id_produto, nome_produto, tipo_produto e quantidade_produto. Ordenação por quantidade, nome e ID. A lista usa rolagem quando necessário; saldo zero aparece como Esgotado. Sem alertas, retorna [].

Os novos blocos vêm da mesma consulta dos indicadores e usam o mesmo instante. Nomes de produtos e responsáveis refletem o cadastro atual. O exemplo de JSON acima ilustra os indicadores; a resposta agora inclui também esses campos.

Conferência da interface: build concluído, consulta ampliada executada somente em leitura no PostgreSQL e revisão no navegador com dados fictícios em servidor separado. Foram conferidos os dois perfis, layout móvel, ausência de meta/dados, meta acima de 100%, saída e falha de atualização com preservação dos últimos dados. Nenhuma conta ou lançamento foi criado. A suíte de testes continua adiada.

Atualização: Produtos já está habilitado no menu do administrador, com cadastro, edição, consulta e exclusão confirmada. Consulte produtos-web.md. O cabeçalho agora é compartilhado por Dashboard e Produtos.
