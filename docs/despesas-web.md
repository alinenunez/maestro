# Despesas no frontend — RF07

A página `/despesas` permite ao administrador registrar, consultar, editar e excluir custos operacionais. O menu aparece somente para esse perfil; um funcionário que tenta abrir o endereço é redirecionado ao dashboard antes de qualquer consulta. A API continua validando a permissão em todas as operações.

O formulário envia `POST /despesas` com tipo (manutenção, energia, água, limpeza ou outros), valor e data do pagamento. O responsável é definido pelo usuário autenticado no backend. Aceita vírgula ou ponto decimal, até dez dígitos inteiros e dois decimais, sem separador de milhar, e exige valor positivo. Datas são enviadas como DATE, sem conversão de fuso; a sugestão inicial é o dia atual de São Paulo.

O histórico usa `GET /despesas`, mostra data, tipo, valor, ID e nome do responsável, e respeita a ordenação da API. O total soma todos os registros em centavos inteiros, sem arredondamento em ponto flutuante. Não possui filtro de período nem paginação nesta etapa; não inclui compras de estoque.

O botão **Editar** consulta `GET /despesas/:id` para preencher o formulário com o registro atual. Permite alterar tipo, valor e data; envia apenas os campos modificados em `PATCH /despesas/:id`. Sem alterações, não envia uma requisição. O responsável pelo registro original é exibido e preservado. **Cancelar edição** volta ao formulário de nova despesa sem gravar.

O botão **Excluir** abre uma confirmação do navegador com ID, tipo, valor e data. Confirmar envia `DELETE /despesas/:id`; cancelar não envia nada. A exclusão é permanente e afeta os relatórios na próxima consulta. Se a despesa excluída estava em edição, o formulário é limpo.

O envio e os botões de ação ficam bloqueados enquanto uma operação está em andamento. Após sucesso, atualiza histórico e total; cadastro e edição também limpam o formulário. Em erro de validação, mantém os dados. Em falha de conexão ou resposta 5xx de uma gravação, pede a conferência do histórico e bloqueia novas operações até essa revisão, sem repetir o envio automaticamente. Após conferir, o administrador pode iniciar um formulário novo ou selecionar novamente uma despesa atualizada. Um `404` informa que o registro não existe mais e recarrega a lista.

Há estados de carregamento, lista vazia, erro e nova tentativa. A interface se adapta a telas estreitas, com rolagem horizontal somente dentro da tabela quando necessário.

Não foram criados campos ou tabelas. Compras registradas no estoque não devem ser duplicadas como despesas. A tabela atual não guarda versões anteriores nem identifica quem realizou uma edição; o responsável mostrado continua sendo quem fez o cadastro.
