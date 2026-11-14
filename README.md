# Sistema Maestro

Trabalho integrador de banco de dados, Engenharia de Software I e Desenvolvimento de Sistemas Web para gestão de vendas, estoque, despesas e reservas de mesas de sinuca.

## Organização

- `database/scripts`: criação do banco e consultas auxiliares PostgreSQL.
- `src`: servidor Node.js com Express, organizado por funcionalidades.
- `web`: interface React com Vite, a configurar.
- `docs`: documentação de requisitos e engenharia de software.

## Banco de dados

O banco utilizado é o PostgreSQL, com nome SistemaMaestro.

Em um banco novo, execute `database/scripts/01_estrutura_sistema_maestro.sql` no Query Tool do pgAdmin. Se as tabelas já existem, não execute novamente: futuras alterações devem ser feitas por scripts de migração.

O arquivo `database/scripts/02_consultas_sistema_maestro.sql` contém consultas opcionais de conferência e disponibilidade. Ajuste o período de exemplo antes de consultar.

A estrutura inclui nove tabelas. Situação do usuário: TRUE para ativo e FALSE para inativo. Status da mesa: ocupada, disponivel ou manutencao. Uma reserva pode incluir várias mesas e possui duração em minutos.

Ainda serão implementados o bloqueio de reservas sobrepostas, os totais de vendas, as movimentações automáticas de estoque e a validação de pelo menos um item por venda e uma mesa por reserva.

## Configuração local

Não versionar senhas, credenciais ou arquivos `.env`. O banco local e seus dados não são enviados ao GitHub ao versionar os scripts SQL.

Tecnologias: Node.js, Express, Sequelize e Passport/JWT no servidor; PostgreSQL no banco; React com Vite na interface futura.

## Organização do servidor

Cada módulo reunirá rotas, controller, service e repository, seguindo o projeto da aula. Os módulos são usuarios, produtos, vendas, despesas, estoque, mesas e reservas.

A pasta src/auth contém a autenticação, com as estratégias Passport e verificações de acesso em auth.config.js. src/database/models contém os modelos Sequelize; src/database/connection.js configura a conexão. O ponto de entrada é index.js na raiz.

Os arquivos .gitkeep mantêm as pastas vazias no Git.

## Executar o servidor

1. Instale as dependências com `npm install`.
2. Em outro computador, copie `.env.example` para `.env`. Nesta configuração local, o arquivo já foi criado.
3. Preencha `DB_PASSWORD` no `.env` e confira host, porta, usuário e nome exato do banco no pgAdmin. Se a senha contiver #, coloque o valor entre aspas duplas.
4. Confira JWT_SECRET no `.env`. A chave local já foi gerada; para outro computador, siga `docs/autenticacao.md`. Execute `npm run dev` ou `npm start`.
5. Acesse http://localhost:3000/health. Com o banco conectado, a resposta será `{"status":"ok","banco":"conectado"}`.

O servidor verifica a conexão antes de iniciar e escuta apenas no computador local. A rota /health retorna 503 se o banco ficar indisponível. Não usamos sync: as tabelas existentes são preservadas.

`index.js` configura a aplicação, registra as rotas e inicia o servidor; `src/database/connection.js` configura o Sequelize. Autenticação e permissões estão configuradas. Estoque, vendas, reservas, despesas e relatórios serão desenvolvidos nas próximas etapas.

## Cadastro de mesas

O módulo segue routes → controller → service → repository → model Sequelize. O model aponta para a tabela existente mesa_sinuca; não executamos sync.

| Método | Rota | Operação |
| --- | --- | --- |
| GET | /mesas | Listar por número |
| GET | /mesas/:id | Buscar pelo identificador |
| POST | /mesas | Cadastrar |
| PATCH | /mesas/:id | Atualizar número e/ou status |
| DELETE | /mesas/:id | Excluir se não houver reservas vinculadas |

Exemplo de corpo JSON para POST /mesas:

```json
{"numero_mesa": 1, "status": "disponivel"}
```

O status é opcional no cadastro e assume disponivel. Os valores aceitos são ocupada, disponivel e manutencao. O número deve ser inteiro positivo e único. O ID é gerado pelo banco e não deve ser enviado no corpo.

Para mudar apenas o status, envie PATCH /mesas/1 com `{"status":"manutencao"}`. O status representa a condição atual; a agenda de reservas será implementada em outra etapa.

Respostas: 201 para criação, 200 para consultas/atualização, 204 para exclusão, 400 para campos inválidos, 404 para mesa inexistente, 409 para número duplicado ou exclusão impedida por reservas. Erros internos não expõem detalhes do banco.

As rotas de mesas agora exigem JWT. Os testes automatizados antigos serão adaptados à autenticação em uma etapa posterior; não foram executados nesta implementação.

## Tipos de produtos

No cadastro e na alteração de tipo, a API aceita os seguintes valores em `tipo_produto`:

| Valor na API | Texto na interface |
| --- | --- |
| bebida_alcoolica | Bebida alcoólica |
| bebida_nao_alcoolica | Bebida não alcoólica |
| guloseima | Guloseima |
| ficha_sinuca | Ficha de sinuca |

Espaços nas extremidades são removidos e letras maiúsculas são convertidas em minúsculas. Tipos fora da lista retornam HTTP 400. Fichas continuam com quantidade de estoque zero, definida automaticamente.

Essa validação não modifica registros já cadastrados. Produtos antigos com tipos genéricos, como bebida, precisam ser classificados explicitamente como alcoólicos ou não alcoólicos. Os testes existentes serão adequados em uma etapa posterior.

## Busca e filtro de produtos

A rota `GET /produtos` aceita os parâmetros opcionais `nome` e `tipo`:

- `/produtos`: lista todos os produtos.
- `/produtos?nome=heineken`: busca parte do nome, sem diferenciar maiúsculas e minúsculas.
- `/produtos?tipo=bebida_alcoolica`: filtra pela categoria padronizada.
- `/produtos?nome=heineken&tipo=bebida_alcoolica`: aplica os dois critérios juntos.

Filtros vazios são ignorados. Tipos inválidos e parâmetros repetidos retornam HTTP 400. Sem resultados, a resposta é um array vazio (`[]`); falhas de consulta retornam erro, sem simular uma lista vazia. Os resultados mantêm a ordenação por nome e ID. A busca trata os caracteres % e _ literalmente e não remove acentos. Na interface, use URLSearchParams para montar a URL com os filtros.

A seleção para vendas deverá guardar o id_produto do resultado, evitando confundir produtos com nomes semelhantes.

## Usuarios e funcionarios

O modulo usa a tabela `usuario` existente, sem funcao/cargo, conforme a decisao do projeto. Segue model, repository, service, controller e routes.

| Metodo | Rota | Operacao |
| --- | --- | --- |
| GET | /usuarios | Listar usuarios por nome |
| GET | /usuarios/:id | Consultar usuario |
| POST | /usuarios | Cadastrar funcionario (exige administrador autenticado) |
| PATCH | /usuarios/:id | Atualizar dados ou situacao |

Exemplo de corpo para POST /usuarios (dados ficticios para preenchimento manual):

```json
{
  "nome_completo": "Funcionario Exemplo",
  "cpf": "12345678901",
  "situacao": true,
  "data_inicio": "2026-11-08",
  "tipo_contratacao": "efetivo",
  "tipo_acesso": "funcionario",
  "email": "funcionario@example.com",
  "data_nascimento": "1995-05-20",
  "senha": "SenhaExemplo123!",
  "confirmacao_senha": "SenhaExemplo123!"
}
```

- `tipo_acesso`: administrador ou funcionario. O primeiro administrador usa `/auth/cadastro-inicial`; `POST /usuarios` aceita apenas funcionario. O perfil não pode ser alterado pelo cadastro.
- `tipo_contratacao`: temporario ou efetivo. Por enquanto, o banco exige esse campo e data_inicio inclusive para administradores; a estrutura nao foi alterada.
- `situacao`: booleano; se omitido no cadastro, assume true. Para inativar, envie PATCH /usuarios/:id com `{"situacao":false}`. Para reativar, envie true. Nao ha exclusao fisica de usuarios.
- CPF: aceita 11 digitos ou mascara 000.000.000-00; salva somente digitos. A validacao atual e de formato, conforme a restricao do banco, sem verificacao dos digitos verificadores.
- Email: salva em minusculas. O banco impede CPF e email repetidos, retornados como conflito HTTP 409.
- Datas: formato AAAA-MM-DD, com validacao de existencia da data.
- Senha e confirmacao sao obrigatorias no cadastro; em atualizacoes, envie ambas somente quando desejar trocar a senha. Confirmacao nao e armazenada. Apenas o hash bcrypt e salvo; nem senha nem hash sao devolvidos pela API. Senhas acima de 72 bytes sao recusadas para evitar truncamento pelo bcrypt.
- Campos desconhecidos, incluindo senha_hash enviado pelo cliente, sao recusados.

Autenticação e permissões estão implementadas. Os dados completos dos usuários ficam restritos ao administrador. Usuários inativos não podem fazer login nem usar tokens previamente emitidos enquanto estiverem inativos. Recuperação de senha por email fica para outra etapa.

Testes automatizados de usuarios ficaram pendentes conforme combinado. A sintaxe dos arquivos foi verificada.

## Login e permissões

Consulte [o guia de autenticação](docs/autenticacao.md) para criar o primeiro administrador, fazer login no Postman/Insomnia e revisar a matriz de permissões.

- `POST /auth/cadastro-inicial`: primeiro administrador, com a chave local no cabeçalho X-Setup-Token; bloqueado depois que já existe administrador.
- `POST /auth/login`: email e senha; devolve JWT com validade de uma hora.
- `GET /auth/me`: dados básicos do usuário autenticado.
- Rotas de negócio: enviar `Authorization: Bearer TOKEN`.
- `GET /usuarios/responsaveis`: ID e nome dos usuários ativos, disponível aos dois perfis para a futura seleção do responsável pela venda.

As chaves reais estão somente no `.env`, ignorado pelo Git. A estrutura do banco não foi alterada. Recuperação de senha e os próximos módulos permanecem pendentes.
