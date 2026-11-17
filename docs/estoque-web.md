# Estoque — interface React

A tela /estoque está disponível para administrador e funcionário (GERENCIAR_ESTOQUE). Segue a disposição da Figura A9 do protótipo: histórico à esquerda e registro de entrada à direita, empilhados em telas menores.

## Registrar uma compra

1. Selecione o tipo e/ou busque pelo nome. Os filtros atuam sobre os produtos retornados por GET /produtos, excluindo ficha_sinuca.
2. Selecione o produto cadastrado na lista. Alterar o nome da busca ou o tipo limpa a seleção para evitar registrar a compra em outro produto.
3. Informe quantidade inteira positiva, valor total da compra e data. O valor aceita vírgula ou ponto decimal, sem separadores de milhar. A data começa no dia atual em America/Sao_Paulo.
4. Registrar entrada envia POST /estoque com id_produto, quantidade_adquirida, valor_total (string decimal) e data_compra (AAAA-MM-DD).

A API existente insere a entrada e aumenta o saldo na mesma transação. A tela não altera o saldo por PATCH nem muda o preço de venda. Não cria uma despesa operacional separada. Após sucesso, recarrega produtos e histórico, mantém o produto/data e limpa quantidade/valor. O histórico conserva seu filtro; selecione Todos os produtos para ver uma compra de outro item.

O botão e os campos ficam bloqueados durante o envio; uma trava também impede chamadas duplicadas por cliques rápidos. Não há reenvio automático. Se a conexão cair sem resposta conclusiva, a mensagem orienta conferir o histórico antes de repetir, pois a compra pode já ter sido gravada. Esse bloqueio local não garante idempotência no servidor.

## Histórico e saldos

GET /estoque lista as compras por data e ID decrescentes. O filtro envia apenas id_produto, conforme o contrato existente. A tabela mostra data, produto, quantidade comprada, custo total e saldo atual. As datas DATE são exibidas diretamente como DD/MM/AAAA, sem conversão de fuso.

Saldo atual é a quantidade no momento da consulta, não um saldo histórico após aquela compra. Compras do mesmo produto exibem o mesmo saldo atual. Até 10 unidades aparece Baixo; zero aparece Esgotado, seguindo o limite escolhido para o dashboard. Atualizar consulta novamente produtos e entradas.

Há estados de carregamento, erro com nova tentativa e lista vazia. Consultas anteriores são canceladas ao mudar o filtro ou sair da página. A API continua verificando sessão, permissões e regras de estoque.

Esta etapa usa somente criação e consulta, disponíveis no backend. Os ícones de edição/exclusão do protótipo não foram habilitados: esses fluxos ainda exigem definir as regras para desfazer compras e saldos já consumidos por vendas. Nenhuma tabela ou rota de backend foi alterada. A suíte de testes automatizados continua adiada conforme combinado.
