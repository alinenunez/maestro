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

Tecnologias: Node.js, Express e Sequelize no servidor; PostgreSQL no banco; React com Vite na interface. Instalação e conexão serão realizadas nas próximas etapas.

## Organização do servidor

Cada módulo reunirá rotas, controller, service e repository, seguindo o projeto da aula. Os módulos são usuarios, produtos, vendas, despesas, estoque, mesas e reservas.

A pasta src/auth será usada para autenticação, com as estratégias Passport e verificações de acesso em auth.config.js, src/database/models, para modelos Sequelize. A conexão ficará em src/database/connection.js e o ponto de entrada é index.js na raiz. 

Os arquivos .gitkeep mantêm as pastas vazias no Git.

## Executar o servidor

1. Instale as dependências com `npm install`.
2. Em outro computador, copie `.env.example` para `.env`. Nesta configuração local, o arquivo já foi criado.
3. Preencha `DB_PASSWORD` no `.env` e confira host, porta, usuário e nome exato do banco no pgAdmin. Se a senha contiver #, coloque o valor entre aspas duplas.
4. Execute `npm run dev` para reiniciar automaticamente após alterações, ou `npm start`.
5. Acesse http://localhost:3000/health. Com o banco conectado, a resposta será `{"status":"ok","banco":"conectado"}`.

O servidor verifica a conexão antes de iniciar e escuta apenas no computador local. A rota /health retorna 503 se o banco ficar indisponível. Não usamos sync: as tabelas existentes são preservadas.

`index.js` configura a aplicação, registra as rotas e inicia o servidor; `src/database/connection.js` configura o Sequelize. Autenticação e módulos funcionais serão implementados posteriormente.

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

Execute `npm test` para os testes HTTP com o repository simulado, sem alterar o banco. Autenticação ainda não foi implementada; execute esta etapa apenas localmente.

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
