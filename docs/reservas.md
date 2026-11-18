# Reservas de mesas

O módulo atende à gestão de reservas do RF08 usando `reserva_mesa`, `reserva_mesa_item` e `mesa_sinuca`, sem alterar as tabelas existentes. Uma reserva reúne uma ou várias mesas no mesmo período. Uma mesa pode participar de várias reservas em horários diferentes.

## Acesso e rotas

Administrador e funcionário usam as rotas com `Authorization: Bearer TOKEN_RECEBIDO_NO_LOGIN`.

| Método | Rota | Operação |
| --- | --- | --- |
| POST | /reservas | Cadastrar reserva com uma ou várias mesas |
| GET | /reservas | Listar reservas por horário, com as mesas vinculadas |
| GET | /reservas?inicio=...&fim=... | Listar reservas que ocupam parte do período informado |
| GET | /reservas/disponibilidade?inicio=...&fim=... | Consultar a agenda de todas as mesas no período |
| GET | /reservas/:id | Consultar uma reserva |
| PATCH | /reservas/:id | Corrigir cliente/telefone, reagendar ou substituir a seleção de mesas |
| DELETE | /reservas/:id | Cancelar por exclusão da reserva e seus vínculos |

## Cadastro e edição

Exemplo fictício de corpo JSON para `POST /reservas`; substitua os IDs por mesas existentes:

```json
{
  "nome_cliente": "Cliente Exemplo",
  "telefone_cliente": "(51) 99999-1234",
  "data_horario_reserva": "2026-11-20T20:00:00-03:00",
  "duracao_minutos": 90,
  "mesas": [1, 2]
}
```

Os cinco campos são obrigatórios. O nome aceita até 150 caracteres. O telefone aceita até 20 caracteres com formatação, contendo entre 8 e 15 dígitos. A duração deve ser um número inteiro positivo, em minutos. A seleção deve ter pelo menos uma mesa, sem IDs repetidos.

Datas precisam incluir o fuso: `2026-11-20T20:00:00-03:00` e `2026-11-20T23:00:00Z` representam o mesmo instante. São aceitos horários com minutos, segundos opcionais e até três casas de milissegundos. Datas inexistentes e horários sem fuso são recusados. O frontend deverá converter o campo de data/hora para um instante com fuso antes de enviar.

O exemplo reserva as duas mesas das 20h às 21h30. As respostas incluem `data_horario_fim`, calculado a partir do início e da duração; esse campo não é uma nova coluna. Datas nas respostas são serializadas em UTC e devem ser apresentadas no horário local pela interface.

No PATCH, envie apenas os campos que deseja alterar. Por exemplo, `{"data_horario_reserva":"2026-11-20T20:20:00-03:00"}` muda o início mantendo a duração. Ao enviar `mesas`, a lista substitui toda a seleção anterior. Todas as regras são verificadas novamente; a própria reserva não é considerada um conflito consigo mesma. Se a alteração falhar, os dados e vínculos anteriores são preservados.

## Horários e disponibilidade

Para consultar das 20h às 22h de 20/11/2026:

```text
GET /reservas/disponibilidade?inicio=2026-11-20T20%3A00%3A00-03%3A00&fim=2026-11-20T22%3A00%3A00-03%3A00
```

Na interface, monte os parâmetros com `URLSearchParams`, especialmente se o fuso tiver sinal `+`. A consulta de disponibilidade exige início e fim, com fim posterior ao início. Na listagem, esses dois filtros são opcionais, mas devem ser enviados juntos. Campos desconhecidos e parâmetros repetidos são recusados.

Cada mesa da consulta de disponibilidade contém:

- `id_mesa` e `numero_mesa`.
- `status_atual`: disponivel, ocupada ou manutencao, conforme o cadastro.
- `tem_reserva`: indica se alguma reserva se sobrepõe ao período pesquisado.
- `disponivel_para_reserva`: verdadeiro quando não há manutenção nem sobreposição no período.

O estado atual e a agenda são informações distintas. Uma mesa ocupada por um cliente presencial pode ter um horário sem reserva; nesse caso, `status_atual` será ocupada e `disponivel_para_reserva` poderá ser true. Isso não afirma que a mesa está fisicamente livre agora. O atendente considera o estado atual ao atender clientes presenciais.

As reservas não alteram automaticamente o status da mesa. Não existe controle de fila ou da duração das partidas presenciais. Se o início precisar ser adiado, o atendente pode reagendar pelo PATCH: a duração é mantida se não for alterada, e o novo término precisa caber antes das próximas reservas. Nenhuma reserva seguinte é deslocada automaticamente.

## Integridade

- A sobreposição é verificada pelo intervalo inteiro, inclusive quando uma reserva contém outra ou atravessa a meia-noite.
- Intervalos adjacentes são permitidos: uma reserva que termina às 21h não impede outra que comece exatamente às 21h.
- Mesas inexistentes ou em manutenção impedem a gravação. Uma única mesa conflitante impede a reserva inteira.
- As mesas são bloqueadas em ordem de ID antes da consulta de conflitos. As gravações usam transação com isolamento READ COMMITTED para consultar os dados confirmados depois de uma eventual espera por outra operação.
- A reserva e seus vínculos são gravados, alterados ou removidos juntos. Uma falha desfaz todas as alterações dessa operação.
- A consulta de disponibilidade é uma fotografia do momento; o cadastro e a edição conferem tudo novamente antes de salvar.
- O controle de conflitos é aplicado pela API. Alterações feitas diretamente por SQL não passam por essas validações.
- Colocar uma mesa em manutenção posteriormente não cancela suas reservas existentes. Elas precisam ser revistas pelo atendente; a edição de uma reserva também revalida manutenção.
- Reservas não criam vendas, despesas, receitas nem movimentações de estoque. A venda de fichas permanece independente.

O cancelamento usa exclusão física porque o modelo atual não possui status de reserva. `DELETE` remove a reserva e seus vínculos, sem excluir mesas, e não conserva histórico de cancelamento. Nenhuma reserva existente foi excluída durante esta implementação.

Não foram acrescentadas regras de horário de funcionamento, duração máxima de uma noite ou bloqueio de datas passadas, pois essas restrições não foram definidas no modelo e nas decisões atuais. A listagem ainda não possui paginação.

## Respostas e conferência

- `201`: reserva criada, com `Location: /reservas/ID`.
- `200`: consulta ou alteração concluída.
- `204`: cancelamento concluído, sem corpo de resposta.
- `400`: campos, datas, duração, período ou seleção de mesas inválidos.
- `401`: autenticação ausente ou inválida; `403`: perfil sem permissão.
- `404`: reserva ou mesa inexistente.
- `409`: conflito de horário ou mesa em manutenção.
- `500`: falha interna na operação, sem expor detalhes do banco. A autenticação mantém `503` quando não consegue consultar o banco.

Conferências desta etapa: sintaxe, carregamento do módulo e consultas somente de leitura para verificar os modelos e relacionamentos. Os testes automatizados continuam adiados, conforme combinado. Os cenários de gravação, concorrência e rollback ainda precisam de validação funcional; nenhum dado real foi criado, alterado ou excluído nesta conferência.

A interface React está disponível em /reservas; veja [o guia da tela](reservas-web.md).
