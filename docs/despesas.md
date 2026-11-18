# Registro e consulta de despesas

O módulo atende ao cadastro e à consulta de despesas operacionais do RF07. Usa a tabela existente `despesa`, relacionada a `usuario`. Não é necessário executar novo SQL e não usamos `sync`.

## Acesso e rotas

Todas as rotas exigem administrador ativo autenticado, com `Authorization: Bearer TOKEN_RECEBIDO_NO_LOGIN`. Funcionários não podem cadastrar nem consultar despesas.

| Método | Rota | Operação |
| --- | --- | --- |
| POST | /despesas | Registrar uma despesa |
| GET | /despesas | Listar despesas da data de pagamento mais recente para a mais antiga |
| GET | /despesas/:id | Consultar uma despesa pelo identificador |

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

## Despesas e compras de estoque

Use esse módulo para custos operacionais. Compras de produtos continuam em `controle_estoque`; o sistema não cria automaticamente uma despesa para cada compra. Não cadastre novamente aqui o custo de uma aquisição já registrada como entrada de estoque.

O resumo financeiro em /relatorios/financeiro soma separadamente as despesas operacionais e os custos de aquisição de estoque. As vendas fornecem as receitas. Consulte [o guia de relatórios](relatorios.md) para filtrar o período e interpretar os totais.

## Respostas e limites

- `201`: despesa registrada, com `Location: /despesas/ID`.
- `200`: consulta concluída.
- `400`: dados, identificador, valor, tipo ou data inválidos; campos extras no cadastro.
- `401`: autenticação ausente ou inválida, incluindo usuário inativo.
- `403`: usuário autenticado sem perfil de administrador.
- `404`: despesa inexistente.
- `500`: falha interna, sem expor detalhes do banco. A autenticação mantém `503` se não conseguir consultar o banco.

Esta etapa inclui cadastro e consulta. Não há rotas de edição ou exclusão de despesas.

Os testes automatizados continuam adiados conforme combinado. A conferência se limita à sintaxe, carregamento e consultas somente de leitura para verificar a compatibilidade com as tabelas. Nenhuma despesa real foi criada; os cenários funcionais de cadastro e permissões ainda precisam de validação.

A interface de cadastro e histórico está disponível; consulte [Despesas no frontend](despesas-web.md).
