# Autenticação e permissões

A autenticação segue o template da aula: `auth.config.js`, `auth.routes.js`, `auth.controller.js`, `auth.service.js` e `auth.repository.js`. As estratégias local (email/senha) e JWT usam Passport. Não há pasta separada de middlewares nem nova tabela de usuários ou permissões.

## Configuração local

O `.env` precisa de duas chaves diferentes:

- `JWT_SECRET`: chave aleatória, com pelo menos 32 caracteres, para assinar os tokens.
- `ADMIN_SETUP_TOKEN`: chave local, com pelo menos 32 caracteres, que autoriza o primeiro cadastro de administrador. Pode ficar vazia para desabilitar esse cadastro.

As duas foram geradas no `.env` local durante esta implementação. Seus valores não aparecem no `.env.example` e não devem ir para o Git. A senha do PostgreSQL foi preservada. Em outro computador, gere cada chave com `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` e preencha o `.env`. Reinicie o servidor após alterar esse arquivo.

Inicie com `npm run dev`. O endpoint `/health` permanece público. As demais rotas de negócio exigem autenticação.

## Primeiro administrador

Se já existe um administrador, use o login. A existência de um administrador inativo também encerra a possibilidade de cadastro inicial: inativar alguém não reabre o cadastro.

Se não existe administrador, envie `POST /auth/cadastro-inicial` no Postman/Insomnia:

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

Sem a chave correta, retorna 403. Com administrador já existente, retorna 409. A verificação e a criação acontecem na mesma transação, bloqueando temporariamente escritas na tabela de usuários para impedir dois primeiros cadastros simultâneos. Nenhuma tabela é recriada.

Depois do cadastro, remova o valor de `ADMIN_SETUP_TOKEN` do `.env` e reinicie o servidor. A criação de funcionários passa a ocorrer em `POST /usuarios`, com token de administrador. Esse endpoint não aceita criar outro administrador. A edição também não permite promover funcionários alterando `tipo_acesso`.

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

`GET /auth/me` devolve o usuário autenticado. O JWT possui validade de uma hora, assinatura HS256, emissor e destinatário verificados. Cada chamada consulta o usuário ativo no banco e considera o perfil atual; não confia em um perfil enviado pelo cliente.

- Credenciais incorretas ou usuário inativo: 401 no login.
- Token ausente, inválido, expirado ou usuário desativado: 401 nas rotas protegidas.
- Perfil sem permissão: 403.
- Falha ao consultar o banco durante autenticação: 503.

Nesta etapa não há refresh token, recuperação por email nem endpoint de logout. A futura interface encerrará o acesso local descartando o token. Tokens já emitidos expiram em até uma hora; a troca de senha, sozinha, não os revoga. Usuários inativos são recusados mesmo antes da expiração. Esse comportamento será revisto se adicionarmos revogação de sessões.

## Permissões nas rotas já implementadas

| Operação | Administrador | Funcionário |
| --- | --- | --- |
| Consultar produtos | Sim | Sim |
| Registrar e consultar entradas de estoque | Sim | Sim |
| Registrar e consultar vendas | Sim | Sim |
| Cadastrar, consultar, editar e cancelar reservas | Sim | Sim |
| Registrar e consultar despesas | Sim | Não |
| Criar, editar ou excluir produtos | Sim | Não |
| Consultar mesas | Sim | Sim |
| Criar, renumerar ou excluir mesas | Sim | Não |
| Atualizar somente o status da mesa | Sim | Sim |
| Listar e editar dados completos dos usuários | Sim | Não |
| Cadastrar funcionários | Sim | Não |
| Consultar responsáveis ativos (ID e nome) | Sim | Sim |

`GET /usuarios/responsaveis` fornece apenas ID e nome dos usuários ativos para a seleção do responsável pelas vendas. Não libera CPF, email ou outros dados cadastrais aos funcionários. O administrador não pode inativar o próprio acesso.

As rotas de estoque usam a permissão GERENCIAR_ESTOQUE, disponível aos dois perfis. As rotas de vendas usam REGISTRAR_VENDAS, também disponível aos dois perfis. As rotas de reservas usam GERENCIAR_RESERVAS, disponível aos dois perfis. As rotas de despesas usam GERENCIAR_DESPESAS, exclusiva do administrador, e identificam automaticamente o responsável pelo usuário autenticado. O mapa de permissões deixa previstas as operações dos próximos módulos: dashboard para ambos os perfis e relatórios para administrador. Esses módulos ainda não têm endpoints implementados nesta etapa.

## Revisão

Foram feitas verificação de sintaxe, carregamento das estratégias e conferência manual dos bloqueios sem token, com token inválido e sem chave de cadastro inicial. Os testes automatizados ficaram para depois, conforme combinado; os testes antigos de mesas e produtos ainda precisarão ser adaptados às rotas autenticadas. Nenhuma conta foi criada automaticamente e nenhum dado cadastral foi alterado para esta revisão.
