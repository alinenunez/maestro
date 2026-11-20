# Cadastro, consulta, edição e exclusão de despesas

O módulo atende ao gerenciamento de despesas operacionais do RF07. Usa a tabela existente `despesa`, relacionada a `usuario`. Não é necessário executar novo SQL e não usamos `sync`.

## Acesso e rotas

Todas as rotas exigem administrador ativo autenticado, com `Authorization: Bearer TOKEN_RECEBIDO_NO_LOGIN`. Funcionários não podem cadastrar nem consultar despesas.

| Método | Rota | Operação |
| --- | --- | --- |
| POST | /despesas | Registrar uma despesa |
| GET | /despesas | Listar despesas da data de pagamento mais recente para a mais antiga |
| GET | /despesas/:id | Consultar uma despesa pelo identificador |
| PATCH | /despesas/:id | Corrigir um ou mais campos da despesa |
| DELETE | /despesas/:id | Excluir permanentemente a despesa |

Na mesma data, a listagem ordena pelo ID decrescente. Sem registros, devolve `[]`. As consultas incluem o objeto `usuario` somente com ID e nome do responsável, sem dados pessoais adicionais ou senha. A listagem ainda não possui filtros nem paginação.

## Cadastro

Envie `Content-Type: application/json` e os três campos obrigatórios:

```json
{
  "tipo_despesa": "energia",
  "valor": "250.75",
  "data_pagamento": "2026-11-14"
}
```

| Valor de tipo_despesa na API | Texto na interface |
| --- | --- |
| manutencao | Manutenção |
| energia | Energia |
| agua | Água |
| limpeza | Limpeza |
| outros | Outros |

Espaços nas extremidades e letras maiúsculas do tipo são normalizados. Os valores enviados na API não levam acentos; tipos fora da lista são recusados. A validação de tipos não altera registros antigos inseridos diretamente no banco.

O valor deve ser maior que zero, com até dez dígitos inteiros e duas casas decimais, respeitando `NUMERIC(12,2)`. Pode ser enviado como número ou string, sempre com ponto decimal. Valores zero, negativos, com vírgula ou mais de duas casas decimais são recusados, sem arredondamento automático. O valor é encaminhado ao banco como string decimal, sem cálculos monetários nesta etapa.

A data deve existir e estar no formato AAAA-MM-DD. O campo do banco é DATE: não recebe horário ou fuso. Não foi acrescentada restrição de datas passadas ou futuras, pois ela não está definida no requisito.

O `id_usuario` é obtido automaticamente do usuário autenticado por `req.user`. Não envie esse campo: o cadastro não permite selecionar outro responsável. O `id_despesa` é gerado pelo banco. Campos extras também são recusados.

O cadastro retorna a despesa gravada, incluindo `id_despesa` e `id_usuario`. O objeto com o nome do responsável é incluído nas consultas. A despesa é salva com um único INSERT; não há gravações em estoque, vendas ou outras tabelas.

## Edição e exclusão

`PATCH /despesas/:id` aceita um objeto não vazio com um ou mais campos: `tipo_despesa`, `valor` e `data_pagamento`. Aplica as mesmas validações do cadastro apenas aos campos enviados e preserva os demais. Exemplo: `{"valor":"275.50"}`. Retorna `200` com o registro atualizado. O responsável original (`id_usuario`) é preservado e não pode ser enviado no corpo.

`DELETE /despesas/:id` remove o registro e retorna `204`, sem corpo. Se o registro não existir, a edição e a exclusão retornam `404`. Cada operação usa uma única instrução de alteração no banco, sem uma consulta prévia para decidir se existe.

A exclusão é física e definitiva. Não há campo de cancelamento, auditoria de alterações ou restauração no modelo atual. A interface pede confirmação com ID, tipo, valor e data antes de excluir. Os relatórios financeiros passam a considerar os registros atuais na próxima consulta; relatórios já abertos devem ser atualizados.

## Despesas e compras de estoque

Use esse módulo para custos operacionais. Compras de produtos continuam em `controle_estoque`; o sistema não cria automaticamente uma despesa para cada compra. Não cadastre novamente aqui o custo de uma aquisição já registrada como entrada de estoque.

O resumo financeiro em /relatorios/financeiro soma separadamente as despesas operacionais e os custos de aquisição de estoque. As vendas fornecem as receitas. Consulte [o guia de relatórios](relatorios.md) para filtrar o período e interpretar os totais.

## Respostas e limites

- `201`: despesa registrada, com `Location: /despesas/ID`.
- `200`: consulta ou edição concluída.
- `204`: exclusão concluída, sem corpo de resposta.
- `400`: dados, identificador, valor, tipo ou data inválidos; campos extras; corpo vazio no cadastro ou na edição.
- `401`: autenticação ausente ou inválida, incluindo usuário inativo.
- `403`: usuário autenticado sem perfil de administrador.
- `404`: despesa inexistente.
- `500`: falha interna, sem expor detalhes do banco. A autenticação mantém `503` se não conseguir consultar o banco.

Não foi adicionada uma suíte de testes automatizados. A validação desta etapa usa conferências isoladas com dados fictícios, sem alterar despesas reais. A validação integrada no PostgreSQL continua pendente.

A interface de cadastro e histórico está disponível; consulte [Despesas no frontend](despesas-web.md).
