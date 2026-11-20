# Produtos — interface React

A tela /produtos segue o protótipo: busca e tabela à esquerda, cadastro/edição à direita, com empilhamento no celular. O menu Produtos está habilitado para ambos os perfis. Funcionários podem apenas consultar, conforme CONSULTAR_PRODUTOS, mas não recebem formulário nem ações de escrita.

Busca por nome e filtro por tipo usam GET /produtos?nome=...&tipo=..., combinados. Buscar aplica o nome; Limpar remove ambos os filtros. Carregamento, erro com nova tentativa e lista vazia são apresentados separadamente. Consultas anteriores são canceladas quando os filtros mudam.

Administrador e funcionário podem usar **Ordenar por** para escolher nome, custo unitário ou quantidade em estoque, em ordem crescente ou decrescente. A ordem inicial é por nome de A a Z. A ordenação atua na lista já filtrada e é mantida quando a busca ou a categoria muda. Quando o campo é estoque, fichas de sinuca ficam ao final porque esse saldo não se aplica a elas.

O cadastro usa POST; a edição busca o registro atualizado por ID e usa PATCH somente com os campos alterados. Alterações de nome e custo não reenviam um saldo antigo. O campo valor_unitario representa o custo unitário de compra, usado no cálculo das entradas de estoque; o preço de venda é informado ao montar cada venda e salvo no item. O custo aceita vírgula ou ponto, sem separadores de milhar; a API recebe string decimal. A tela não possui campo para editar quantidade: novos produtos começam com saldo zero, as entradas de estoque aumentam o saldo e as vendas de produtos físicos o diminuem. A API de Produtos ainda aceita quantidade_produto validada, mas a interface não usa esse campo para ajustar saldos.

Fichas não têm controle de estoque e aparecem como Não se aplica na tabela. A API grava zero automaticamente. Converter produto físico em ficha mostra aviso de que o saldo será zerado. Converter ficha em produto físico mantém o saldo zero pela tela; para adicionar unidades, registre uma entrada em Estoque.

A exclusão exige confirmação em diálogo e usa DELETE. Produtos vinculados a vendas ou compras são recusados pela API com 409; a mensagem é exibida e o registro permanece. O cliente agora aceita respostas 204 sem tentar ler JSON. Botões são bloqueados durante a operação, e a lista é atualizada após sucesso. Se os filtros ocultarem um item recém-criado/alterado, use Limpar para encontrá-lo.

Não há cadastro automático de dados nem alteração nas tabelas. A suíte de testes permanece adiada. As permissões continuam sendo verificadas pela API.
