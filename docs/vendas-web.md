# Vendas — interface React (RF06)

A tela /vendas está disponível para administrador e funcionário, usando REGISTRAR_VENDAS. Segue a Figura A10 do protótipo: formulário à esquerda, resumo à direita e histórico abaixo. Os blocos são empilhados no celular.

## Montar e finalizar o pedido

- Os produtos de GET /produtos podem ser filtrados por tipo. A escolha usa o ID do cadastro; trocar o filtro limpa a seleção. Tipos antigos não padronizados não aparecem na seleção.
- O operador informa o valor unitário de venda, aceitando vírgula ou ponto decimal, sem separador de milhar. O campo começa vazio e é limpo ao trocar produto ou tipo. O subtotal é somente leitura e acompanha automaticamente preço × quantidade. Os cálculos da interface usam centavos inteiros (BigInt), com limite de NUMERIC(12,2), assim como o backend. Preço zero é aceito; quantidades devem ser inteiros positivos até 2147483647.
- Adicionar o mesmo produto com o mesmo preço soma as quantidades em uma linha. Um preço diferente é recusado; para alterá-lo, remova o item e adicione novamente com a quantidade total e o preço desejado. A disponibilidade considera toda a quantidade já no pedido. Remover retira apenas o item escolhido e recalcula o total. Nenhuma dessas ações grava uma venda ou movimenta estoque.
- Fichas de sinuca podem ser vendidas mesmo com saldo zero e não geram baixa de estoque nem reserva.
- O responsável é selecionado explicitamente a partir de GET /usuarios/responsaveis (usuários ativos). O operador autenticado não substitui a escolha.
- A confirmação de maioridade aparece ao selecionar bebida alcoólica ou quando o pedido contém álcool. É exigida para adicionar álcool e para finalizar todo o pedido, mesmo após selecionar outro tipo. O próximo pedido começa com a confirmação desmarcada.
- Antes de enviar a venda, a tela reconsulta produtos e responsáveis. Se o tipo mudou, atualiza o resumo e exige nova finalização após revisão. O preço digitado é preservado, mesmo que o custo de compra no cadastro tenha mudado. Estoque insuficiente, responsável indisponível e produtos inválidos impedem o envio, preservando o pedido para correção.
- POST /vendas recebe somente id_usuario, confirmacao_maior_idade e itens com id_produto/quantidade/valor_unitario. O backend valida os preços informados e recalcula o total, define data/hora e mantém a transação. Alterações entre a última consulta e a gravação ainda são verificadas pelo backend; a mensagem de sucesso mostra o total efetivamente registrado.
- Após sucesso, o pedido e os campos são limpos, e produtos, responsáveis e histórico são recarregados. Os indicadores do dashboard são consultados ao retornar àquela tela.

## Envios repetidos e falhas

O botão de finalização, os campos e as ações do pedido ficam bloqueados durante o processamento. Uma trava em memória também impede chamadas repetidas no tratamento do evento. Não há reenvio automático de POST.

Se o envio falhar sem resultado conclusivo (conexão, resposta inválida ou erro de servidor), o pedido fica preservado e bloqueado para nova finalização, com orientação para conferir o histórico. O atendente pode informar que localizou a venda e limpar o pedido, ou liberar nova tentativa se não a localizou. A liberação não envia automaticamente.

Essa proteção atua somente na tela atual. Conforme decisão do projeto, não foi adicionado identificador de idempotência ao backend. Repetições diretas da requisição, outras abas e tentativas depois de uma resposta incerta ainda exigem cuidado; não há garantia de deduplicação entre requisições independentes.

O pedido fica apenas em memória: sair da página ou recarregá-la descarta o rascunho. As vendas confirmadas continuam no banco.

## Histórico

GET /vendas apresenta número, data/hora em America/Sao_Paulo, responsável e total, com botão Atualizar histórico. Ver itens abre um diálogo com GET /vendas/:id, exibindo quantidades e preços praticados naquela venda, sem recalcular pelos preços atuais. Há estados de carregamento, erro com nova tentativa e lista vazia; consultas são canceladas ao sair ou fechar os detalhes.

A lista segue a ordem da API, sem filtros ou paginação nesta etapa, com rolagem própria. Não há edição ou cancelamento de vendas. As permissões seguem sendo verificadas no servidor. Nenhuma tabela ou rota foi adicionada. O contrato de POST /vendas exige agora valor_unitario em cada item. A suíte de testes automatizados permanece adiada conforme combinado.
