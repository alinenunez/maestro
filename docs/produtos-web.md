# Produtos — interface React

A tela /produtos segue o protótipo: busca e tabela à esquerda, cadastro/edição à direita, com empilhamento no celular. O menu Produtos está habilitado para ambos os perfis. Funcionários podem apenas consultar, conforme CONSULTAR_PRODUTOS, mas não recebem formulário nem ações de escrita.

Busca por nome e filtro por tipo usam GET /produtos?nome=...&tipo=..., combinados. Buscar aplica o nome; Limpar remove ambos os filtros. Carregamento, erro com nova tentativa e lista vazia são apresentados separadamente. Consultas anteriores são canceladas quando os filtros mudam.

O cadastro usa POST; a edição busca o registro atualizado por ID e usa PATCH somente com os campos alterados. Nome/preço não reenviam um saldo antigo. O preço aceita vírgula ou ponto, sem separadores de milhar; a API recebe string decimal. Quantidades devem ser inteiros não negativos. A alteração manual do saldo não cria uma compra: compras deverão usar a tela de Estoque.

Fichas não exibem campo de quantidade e aparecem como Não se aplica na tabela. A API grava zero automaticamente. Converter produto físico em ficha mostra aviso de que o saldo será zerado. Converter ficha em produto físico permite informar quantidade.

A exclusão exige confirmação em diálogo e usa DELETE. Produtos vinculados a vendas ou compras são recusados pela API com 409; a mensagem é exibida e o registro permanece. O cliente agora aceita respostas 204 sem tentar ler JSON. Botões são bloqueados durante a operação, e a lista é atualizada após sucesso. Se os filtros ocultarem um item recém-criado/alterado, use Limpar para encontrá-lo.

Não há cadastro automático de dados nem alteração nas tabelas. A suíte de testes permanece adiada. As permissões continuam sendo verificadas pela API.
