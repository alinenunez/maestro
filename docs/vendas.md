# Registro e consulta de vendas

O módulo implementa o registro de vendas do RF06 usando as tabelas existentes `venda`, `item_venda`, `produtos` e `usuario`. Não é necessário executar um novo script SQL. Não há uso de `sync`.

## Acesso e rotas

Administrador e funcionário podem registrar e consultar vendas. Envie `Authorization: Bearer TOKEN_RECEBIDO_NO_LOGIN` em todas as chamadas.

| Método | Rota | Resultado |
| --- | --- | --- |
| POST | /vendas | Registra a venda, seus itens e a baixa de estoque; retorna a venda detalhada |
| GET | /vendas | Lista vendas da mais recente para a mais antiga, com ID e nome do responsável |
| GET | /vendas/:id | Consulta uma venda com seus itens, produtos e responsável |

A listagem ainda não possui filtros nem paginação. Sem vendas, retorna `[]`. Os dados do responsável nas respostas se limitam ao ID e nome, sem expor CPF, email ou senha.

## Registrar uma venda

Selecione os produtos em `GET /produtos?tipo=...&nome=...` e o responsável em `GET /usuarios/responsaveis`. Use os IDs retornados. O responsável selecionado pode ser diferente do operador autenticado.

Exemplo fictício para `POST /vendas`, com `Content-Type: application/json` (substitua os IDs por registros existentes):

```json
{
  "id_usuario": 1,
  "confirmacao_maior_idade": true,
  "itens": [
    { "id_produto": 1, "quantidade": 3 },
    { "id_produto": 2, "quantidade": 4 },
    { "id_produto": 3, "quantidade": 1 }
  ]
}
```

O responsável e pelo menos um item são obrigatórios. Cada item aceita somente `id_produto` e `quantidade`, um número inteiro positivo. Produtos repetidos são agrupados somando suas quantidades, respeitando a chave composta de `item_venda`. A disponibilidade é conferida pela quantidade acumulada.

`confirmacao_maior_idade` aceita somente booleano e assume `false` quando omitido. Havendo qualquer produto do tipo `bebida_alcoolica`, precisa ser `true` para a venda ser concluída. A confirmação é informada pelo atendente; a API não a preenche automaticamente.

O servidor define data/hora, preços unitários e total. Não envie esses campos: eles serão recusados. Os preços vêm do cadastro no momento da finalização. Produtos com tipos antigos não padronizados ou preços inválidos precisam ser corrigidos antes de vender.

## Valores e estoque

- O preço de venda de cada produto é copiado para `item_venda.valor_unitario`. Mudanças posteriores no cadastro não recalculam vendas anteriores.
- O total soma quantidade vezes preço de cada item. O cálculo usa centavos inteiros (`BigInt`) para evitar imprecisão decimal. Os valores são gravados e devolvidos como strings decimais, por exemplo `"63.00"`, dentro do limite de `NUMERIC(12,2)`.
- O saldo dos produtos físicos precisa cobrir a quantidade solicitada. Uma venda que consome exatamente o saldo é permitida e deixa estoque zero.
- Para `ficha_sinuca`, quantidade e valor são registrados na venda, mas não se exige saldo nem se executa baixa de estoque.
- O usuário responsável precisa existir, estar ativo e ter perfil administrador ou funcionário.
- Venda, itens e baixas são gravados na mesma transação. Uma falha desfaz todas essas gravações.
- Durante a transação, os produtos são bloqueados em ordem de ID para que vendas e entradas de estoque concorrentes utilizem saldos consistentes. O responsável também fica protegido contra alteração durante a validação e gravação.
- O registro não cria reservas, entradas de estoque nem despesas. Reservas continuam independentes das vendas.

Exemplo: 3 bebidas de R$ 9,00 + 4 fichas de R$ 5,00 + 1 guloseima de R$ 16,00 totalizam R$ 63,00. Saem do estoque somente as 3 bebidas e a guloseima.

O detalhe da venda usa os preços históricos dos itens. O nome e o tipo do produto, assim como o nome do responsável, são consultados nos cadastros atuais, pois essas descrições não têm cópia histórica nas tabelas existentes.

## Respostas e limites desta etapa

- `201`: venda registrada, com cabeçalho `Location: /vendas/ID`.
- `200`: consulta concluída.
- `400`: corpo, ID ou quantidade inválidos, pedido vazio, campos não permitidos, total acima do limite ou ausência de confirmação para álcool.
- `401`: autenticação ausente ou inválida.
- `403`: perfil sem permissão.
- `404`: venda, produto ou responsável inexistente.
- `409`: estoque insuficiente, responsável inativo/perfil inválido ou cadastro de produto incompatível.
- `500`: falha interna ao processar a venda; detalhes do banco não são expostos. Falhas na consulta da autenticação seguem retornando `503`.

O módulo de vendas não inclui edição/cancelamento. A tela de montagem do pedido e o histórico estão implementados em /vendas; consulte [o guia da interface](vendas-web.md). O resumo financeiro por período está disponível em /relatorios/financeiro, documentado no [guia de relatórios](relatorios.md).

### Decisão sobre envios repetidos

Conforme decisão do projeto, o bloqueio está implementado somente no frontend, na tela de vendas. Não foi adicionado campo ou tabela para identificar pedidos repetidos.

A tela de vendas implementa:

- Desabilitar o botão Finalizar enquanto o envio estiver em andamento, exibindo o estado de processamento.
- Impedir um segundo envio no próprio tratamento da ação, inclusive acionamentos pelo teclado.
- Limpar o pedido após a confirmação de sucesso.
- Não reenviar automaticamente uma venda quando houver falha de conexão com resultado incerto; permitir conferir o histórico antes de uma nova tentativa.

Essa decisão cobre cliques repetidos durante o processamento na mesma tela. O cenário CT07-03 de repetição direta da solicitação continua sem garantia no backend: cada POST válido cria uma venda, mesmo com corpo idêntico. A transação continua protegendo contra gravações parciais.

Os testes automatizados foram adiados conforme combinado. A conferência desta entrega se limita à sintaxe, carregamento da aplicação e compatibilidade dos modelos/consultas com o banco em acesso somente de leitura; não certifica os cenários funcionais de gravação, falha ou concorrência.
