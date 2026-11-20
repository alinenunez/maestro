# Reservas — interface React (RF08)

A tela /reservas está disponível aos dois perfis. A disposição segue a Figura A11: situação atual do salão, agenda e formulário, com empilhamento no celular. O menu usa as rotas existentes, sem mudanças no banco ou no backend.

## Agenda e horário

A agenda começa no dia atual de São Paulo e lista reservas que ocupam qualquer parte desse dia, inclusive reservas iniciadas na véspera. Ver todas remove o filtro. Os cartões mostram cliente, telefone, mesas, início e término. Atualizar recarrega a agenda e as mesas.

Os campos de data/hora representam America/Sao_Paulo, mesmo em um computador configurado para outro fuso. A conversão usa Intl e envia ISO com fuso à API. A duração é informada em minutos; o término pode atravessar a meia-noite. Horários inexistentes em transições históricas de fuso são recusados. Na edição, segundos e milissegundos existentes são preservados.

## Registrar e editar

1. Informe cliente, telefone, data/hora e duração.
2. Consulte a disponibilidade e selecione uma ou várias mesas.
3. Registre a reserva. A agenda passa a mostrar o dia de início do registro salvo.

Alterar início ou duração invalida a consulta anterior. Atualizações das mesas ou da agenda também exigem nova consulta antes de salvar. Seleções indisponíveis precisam ser corrigidas; nenhuma mesa é retirada silenciosamente da reserva. A API revalida conflitos e manutenção na gravação.

Editar busca os dados atualizados em GET /reservas/:id. Para consultar a disponibilidade durante a edição, a tela combina GET /reservas/disponibilidade com GET /reservas no mesmo intervalo e desconta somente a reserva editada. Outras reservas continuam bloqueando as mesas. PATCH envia apenas os campos alterados. Sair da edição descarta o rascunho local.

Respostas de erro preservam o formulário. Conflitos exigem nova consulta. Cliques repetidos são bloqueados durante o envio, sem repetição automática. Se a resposta de gravação for inconclusiva, o atendente deve conferir a agenda antes de liberar o formulário. Não há deduplicação de requisições independentes no backend.

## Situação atual das mesas

GET /mesas mostra disponível, ocupada ou manutenção. Ambos os perfis podem selecionar outra situação e salvar, enviando PATCH /mesas/:id somente com status. Essa ação não altera reservas existentes. O administrador também pode cadastrar, renumerar e excluir mesas pelo botão Gerenciar mesas, conforme a seção abaixo.

O status atual e a disponibilidade para o período são apresentados separadamente. Uma mesa ocupada agora pode estar livre na agenda do horário desejado. Manutenção e sobreposição impedem a reserva. Reservar não muda automaticamente o status da mesa, não controla partidas ou filas e não gera vendas.

## Cancelamento

Cancelar reserva abre confirmação com cliente e número da reserva. Confirmar usa DELETE /reservas/:id e aceita o retorno 204. Conforme o modelo existente, a reserva e seus vínculos são excluídos sem histórico de cancelamento; as mesas permanecem cadastradas. A operação não cancela vendas nem altera a situação física da mesa.

A tela possui carregamento, listas vazias, mensagens de erro e novas tentativas. Consultas desatualizadas são canceladas para evitar resultados de horários anteriores. Não foram adicionadas restrições de duração de uma noite, datas passadas ou horário comercial além das regras já existentes. Testes automatizados continuam adiados conforme combinado.

## Gerenciamento de mesas

Em Reservas, o administrador pode abrir Gerenciar mesas no bloco Situação atual do salão. É possível cadastrar número e situação inicial, alterar somente o número e excluir com confirmação. Usa as rotas existentes POST /mesas, PATCH /mesas/:id e DELETE /mesas/:id. O funcionário continua apenas consultando e alterando a situação atual.

O número deve ser inteiro positivo até 2147483647 e não pode repetir outro cadastro. A API confirma a unicidade e impede exclusão de mesas com reservas vinculadas. Não se excluem reservas automaticamente. Renumerar mantém o ID e os vínculos das reservas. A situação atual é alterada pelos controles já existentes do salão.

Após uma alteração, a lista e a agenda são atualizadas e a consulta de disponibilidade anterior é invalidada. Durante o envio os controles de gerenciamento e situação ficam bloqueados. Se a gravação não puder ser confirmada, a tela exige conferir a lista antes de iniciar outra operação. Não houve mudança no banco ou no backend.
