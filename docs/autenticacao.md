# Autenticação e permissões

A autenticação segue o template da aula: `auth.config.js`, `auth.routes.js`, `auth.controller.js`, `auth.service.js` e `auth.repository.js`. As estratégias local (email/senha) e JWT usam Passport. Não há pasta separada de middlewares nem nova tabela de usuários ou permissões.

## Configuração local

O `.env` precisa de duas chaves diferentes:

- `JWT_SECRET`: chave aleatória, com pelo menos 32 caracteres, para assinar os tokens.
- `ADMIN_SETUP_TOKEN`: chave local, com pelo menos 32 caracteres, que autoriza o cadastro de administradores pela tela pública `/cadastro-inicial`. Pode ficar vazia para desabilitar novos cadastros.

As duas foram geradas no `.env` local durante esta implementação. Seus valores não aparecem no `.env.example` e não devem ir para o Git. A senha do PostgreSQL foi preservada. Em outro computador, gere cada chave com `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` e preencha o `.env`. Reinicie o servidor após alterar esse arquivo.

Inicie com `npm run dev`. O endpoint `/health` permanece público. As rotas de negócio exigem autenticação. As rotas públicas `/auth/recuperar-senha` e `/auth/redefinir-senha` atendem à recuperação por email e possuem limites de tentativas. Configure os dados SMTP no `.env` conforme o [guia de recuperação](recuperacao-senha.md).

## Cadastro de administradores

Abra `/cadastro-inicial` pelo link na tela de login. Informe os dados e a chave local de configuração. O fluxo permite cadastrar mais de um administrador e não exige que já exista uma conta administrativa. Alternativamente, envie `POST /auth/cadastro-inicial` no Postman/Insomnia:

- Cabeçalho `Content-Type`: `application/json`.
- Cabeçalho `X-Setup-Token`: o valor de `ADMIN_SETUP_TOKEN` do seu `.env` local.
- Corpo: os mesmos dados pessoais do cadastro de usuários. `tipo_acesso` e `situacao` podem ser omitidos; são definidos como administrador e true. Caso enviados, devem ter esses valores.

```json
{
  "nome_completo": "Administrador Exemplo",
  "cpf": "12345678901",
  "email": "admin@example.com",
  "data_nascimento": "1990-05-20",
  "data_inicio": "2026-11-08",
  "tipo_contratacao": "efetivo",
  "senha": "SubstituaPorSuaSenha",
  "confirmacao_senha": "SubstituaPorSuaSenha"
}
```

Os dados acima são fictícios; o servidor não cria essa conta automaticamente. Data de início e tipo de contratação continuam obrigatórios porque a estrutura do banco foi mantida.

Sem a chave correta, retorna 403. Tentativas são limitadas por endereço IP. CPF e email duplicados retornam 409. Nenhuma tabela é recriada.

Mantenha `ADMIN_SETUP_TOKEN` somente no `.env` do servidor, use uma chave aleatória forte e compartilhe-a apenas com pessoas autorizadas a criar administradores. Remova ou esvazie a variável e reinicie o servidor para desabilitar novos cadastros pela tela. Funcionários continuam sendo criados em `POST /usuarios`, com token de administrador; esse endpoint não aceita criar administradores e a tela de Funcionários permanece restrita a funcionários.

## Login e sessão

Envie `POST /auth/login` com:

```json
{
  "email": "admin@example.com",
  "senha": "SuaSenha"
}
```

A resposta contém `token`, `tipo` (Bearer), `expira_em` (3600 segundos) e `usuario` (ID, nome, email, perfil e situação). Não inclui CPF, senha ou hash. O email é normalizado para minúsculas; a senha é comparada com bcrypt.

Nas chamadas protegidas, use o cabeçalho:

```text
Authorization: Bearer TOKEN_RECEBIDO_NO_LOGIN
```

`GET /auth/me` devolve o usuário autenticado. O JWT possui validade de uma hora, assinatura HS256, emissor e destinatário verificados. Cada chamada consulta o usuário ativo no banco, confere a versão da credencial e considera o perfil atual; não confia em um perfil enviado pelo cliente. A versão é uma assinatura derivada da senha armazenada e do email, sem expor o hash bcrypt.

- Credenciais incorretas ou usuário inativo: 401 no login.
- Token ausente, inválido, expirado ou usuário desativado: 401 nas rotas protegidas.
- Perfil sem permissão: 403.
- Falha ao consultar o banco durante autenticação: 503.

Nesta etapa não há refresh token nem endpoint de logout. A futura interface encerrará o acesso local descartando o token. Tokens de login expiram em até uma hora e passam a ser recusados após a troca da senha ou do email, inclusive quando alterados pelo administrador. Usuários inativos são recusados enquanto estiverem inativos. Tokens emitidos antes da inclusão da versão da credencial exigem novo login.

A recuperação por email usa um token separado, válido por 15 minutos. A alteração da senha invalida os links anteriores e não realiza login automático. Veja os campos e exemplos no [guia de recuperação de senha](recuperacao-senha.md).

## Permissões nas rotas já implementadas

| Operação | Administrador | Funcionário |
| --- | --- | --- |
| Consultar produtos | Sim | Sim |
| Registrar e consultar entradas de estoque | Sim | Sim |
| Registrar e consultar vendas | Sim | Sim |
| Cadastrar, consultar, editar e cancelar reservas | Sim | Sim |
| Registrar e consultar despesas | Sim | Não |
| Consultar resumo financeiro por período | Sim | Não |
| Consultar dashboard | Sim | Sim |
| Criar, editar ou excluir produtos | Sim | Não |
| Consultar mesas | Sim | Sim |
| Criar, renumerar ou excluir mesas | Sim | Não |
| Atualizar somente o status da mesa | Sim | Sim |
| Listar e editar dados completos dos usuários | Sim | Não |
| Cadastrar funcionários | Sim | Não |
| Consultar responsáveis ativos (ID e nome) | Sim | Sim |

`GET /usuarios/responsaveis` fornece apenas ID e nome dos usuários ativos para a seleção do responsável pelas vendas. Não libera CPF, email ou outros dados cadastrais aos funcionários. O administrador não pode inativar o próprio acesso.

As rotas de estoque usam a permissão GERENCIAR_ESTOQUE, disponível aos dois perfis. As rotas de vendas usam REGISTRAR_VENDAS, também disponível aos dois perfis. As rotas de reservas usam GERENCIAR_RESERVAS, disponível aos dois perfis. As rotas de despesas usam GERENCIAR_DESPESAS, exclusiva do administrador, e identificam automaticamente o responsável pelo usuário autenticado. A rota /relatorios/financeiro usa CONSULTAR_RELATORIOS, exclusiva do administrador. A rota /dashboard usa CONSULTAR_DASHBOARD, disponível aos dois perfis; ela não expõe custos ou despesas do relatório financeiro.

## Revisão

Foram feitas verificação de sintaxe, carregamento das estratégias e conferência manual dos bloqueios sem token, com token inválido e sem chave de cadastro inicial. Os testes automatizados ficaram para depois, conforme combinado; os testes antigos de mesas e produtos ainda precisarão ser adaptados às rotas autenticadas. Nenhuma conta foi criada automaticamente e nenhum dado cadastral foi alterado para esta revisão.

## Tela do cadastro inicial

A página React /cadastro-inicial usa o layout de autenticação. Reúne nome, CPF, e-mail, nascimento, início, contratação, senha, confirmação e chave de cadastro de administrador. Data de início e contratação continuam obrigatórias no banco; não foi adicionado função/cargo. CPF recebe validação de formato, igual à API.

A chave é o valor de ADMIN_SETUP_TOKEN, preenchido manualmente pela pessoa responsável pela instalação. Não coloque essa variável no frontend nem em VITE_*. A interface envia a chave apenas no cabeçalho X-Setup-Token de POST /auth/cadastro-inicial; nunca na URL, corpo JSON ou armazenamento local. Senhas e chave ficam somente no estado da página, são descartadas ao sair e limpas após sucesso ou resposta inconclusiva.

O backend define o perfil administrador e a situação ativa, valida a chave e limita tentativas de cadastro. A tela não consulta publicamente dados de contas; erros de validação são exibidos conforme a resposta da API. Quem já está autenticado é redirecionado ao dashboard.

Após sucesso, a tela encaminha ao login com mensagem de confirmação, sem autenticação automática. Cliques repetidos ficam bloqueados durante o envio. Em falha de rede ou resposta 5xx, o formulário fica bloqueado e orienta tentar o login antes de iniciar outro cadastro, pois a criação pode ter ocorrido.
