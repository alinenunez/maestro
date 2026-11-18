# Despesas no frontend — RF07

A página `/despesas` permite ao administrador registrar e consultar custos operacionais. O menu aparece somente para esse perfil; um funcionário que tenta abrir o endereço é redirecionado ao dashboard antes de qualquer consulta. A API continua validando a permissão.

O formulário envia `POST /despesas` com tipo (manutenção, energia, água, limpeza ou outros), valor e data do pagamento. O responsável é definido pelo usuário autenticado no backend. Aceita vírgula ou ponto decimal, até dez dígitos inteiros e dois decimais, sem separador de milhar, e exige valor positivo. Datas são enviadas como DATE, sem conversão de fuso; a sugestão inicial é o dia atual de São Paulo.

O histórico usa `GET /despesas`, mostra data, tipo, valor, ID e nome do responsável, e respeita a ordenação da API. O total soma todos os registros em centavos inteiros, sem arredondamento em ponto flutuante. Não possui filtro de período nem paginação nesta etapa; não inclui compras de estoque.

O envio fica bloqueado enquanto está em andamento. Após sucesso, limpa o formulário e atualiza histórico e total. Em erro de validação, mantém os dados. Em falha de conexão ou resposta 5xx, pede a conferência do histórico e bloqueia novo envio até essa revisão, sem repetir o lançamento automaticamente.

Há estados de carregamento, lista vazia, erro e nova tentativa. A interface se adapta a telas estreitas, com rolagem horizontal somente dentro da tabela quando necessário.

Não foram criadas rotas de edição/exclusão, campos ou tabelas. Esses botões do protótipo não são exibidos porque a API atual oferece cadastro e consulta. Compras registradas no estoque não devem ser duplicadas como despesas.
