# Funcionários no frontend — RF02

A tela `/funcionarios` fica disponível somente para administradores. Funcionários são redirecionados ao dashboard antes de qualquer consulta. A API continua responsável pela autorização.

Usa GET /usuarios para a lista (exibindo apenas tipo_acesso funcionario), GET /usuarios/:id para carregar os dados atuais antes de editar, POST /usuarios para cadastrar e PATCH /usuarios/:id para atualizar somente campos alterados. Administradores não são gerenciados por esta tela. Busca por nome e filtro de situação são locais, sobre a lista completa.

Cadastro: nome completo, CPF, e-mail, nascimento, início, contratação (efetivo/temporário), situação (ativo/inativo), senha e confirmação. O perfil enviado é sempre funcionario. CPF aceita 11 dígitos ou pontuação; a validação é de formato, como no backend, sem verificar os dígitos verificadores. Datas seguem DATE, sem conversão de fuso; a sugestão de início é o dia atual de São Paulo. Não se acrescentaram regras de idade ou datas futuras.

Na lista o CPF aparece parcialmente oculto; o formulário administrativo permite consultar e editar o valor completo. Senhas não são recebidas nem exibidas pela API. Na edição só são enviadas se Alterar senha estiver marcado, com confirmação igual e limite de 72 bytes. Não são persistidas no armazenamento do navegador. Cancelar, salvar ou fechar a página descarta os campos; falhas de resultado incerto também limpam a senha.

Mudar a situação para inativo exige confirmação antes de salvar. Não há exclusão física: o histórico é preservado. A reativação é feita editando a situação para ativo. O perfil de acesso não pode ser promovido pelo formulário.

Há bloqueio de cliques repetidos durante o envio. Se a resposta não permitir confirmar a gravação, a edição fica bloqueada e orienta conferir a lista antes de abrir novamente o cadastro. Conflitos de CPF/e-mail e erros de validação da API são apresentados mantendo os dados.

Nenhuma tabela ou rota foi alterada. Função/cargo do protótipo não está disponível no banco atual e não foi acrescentada. A tabela permite rolagem horizontal no celular e o formulário se adapta a uma coluna. Testes automatizados permanecem adiados conforme combinado.
