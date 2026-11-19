# Sistema Maestro

Trabalho integrador de banco de dados, Engenharia de Software I e Desenvolvimento de Sistemas Web para gestão de vendas, estoque, despesas e reservas de mesas de sinuca.

## Organização

- `database/scripts`: criação do banco e consultas auxiliares PostgreSQL.
- `src`: servidor Node.js com Express, organizado por funcionalidades.
- `web`: interface React com Vite; login, recuperação de senha e início da sessão implementados.
- `docs`: documentação de requisitos e engenharia de software.

## Banco de dados

O banco utilizado é o PostgreSQL, com nome SistemaMaestro.

Em um banco novo, execute `database/scripts/01_estrutura_sistema_maestro.sql` no Query Tool do pgAdmin. Se as tabelas já existem, não execute novamente: futuras alterações devem ser feitas por scripts de migração.

O arquivo `database/scripts/02_consultas_sistema_maestro.sql` contém consultas opcionais de conferência e disponibilidade. Ajuste o período de exemplo antes de consultar.

A estrutura inclui nove tabelas. Situação do usuário: TRUE para ativo e FALSE para inativo. Status da mesa: ocupada, disponivel ou manutencao. Uma reserva pode incluir várias mesas e possui duração em minutos.

As entradas e vendas já atualizam o saldo automaticamente. As vendas calculam o total e exigem pelo menos um item. As reservas exigem pelo menos uma mesa e verificam conflitos de horário e manutenção pela API.

## Configuração local

Não versionar senhas, credenciais ou arquivos `.env`. O banco local e seus dados não são enviados ao GitHub ao versionar os scripts SQL.

Tecnologias: Node.js, Express, Sequelize e Passport/JWT no servidor; PostgreSQL no banco; React com Vite na interface futura.

## Organização do servidor

Cada módulo reunirá rotas, controller, service e repository, seguindo o projeto da aula. Os módulos são usuarios, produtos, vendas, despesas, estoque, mesas, reservas, relatorios e dashboard.

A pasta src/auth contém a autenticação, com as estratégias Passport e verificações de acesso em auth.config.js. src/database/models contém os modelos Sequelize; src/database/connection.js configura a conexão. O ponto de entrada é index.js na raiz.

Os arquivos .gitkeep mantêm as pastas vazias no Git.

## Executar o servidor

1. Instale as dependências com `npm install`.
2. Em outro computador, copie `.env.example` para `.env`. Nesta configuração local, o arquivo já foi criado.
3. Preencha `DB_PASSWORD` no `.env` e confira host, porta, usuário e nome exato do banco no pgAdmin. Se a senha contiver #, coloque o valor entre aspas duplas.
4. Confira JWT_SECRET no `.env`. A chave local já foi gerada; para outro computador, siga `docs/autenticacao.md`. Execute `npm run dev` ou `npm start`.
5. Acesse http://localhost:3000/health. Com o banco conectado, a resposta será `{"status":"ok","banco":"conectado"}`.

O servidor verifica a conexão antes de iniciar e escuta apenas no computador local. A rota /health retorna 503 se o banco ficar indisponível. Não usamos sync: as tabelas existentes são preservadas.

`index.js` configura a aplicação, registra as rotas e inicia o servidor; `src/database/connection.js` configura o Sequelize. Autenticação, permissões, entradas de estoque, vendas, reservas, cadastro/consulta de despesas, resumo financeiro e backend do dashboard estão implementados. O detalhamento dos relatórios financeiros também está disponível. A base React e as telas de acesso estão implementadas. As telas dos módulos de negócio serão desenvolvidas nas próximas etapas.

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

Para mudar apenas o status, envie PATCH /mesas/1 com `{"status":"manutencao"}`. O status representa a condição atual; a agenda de reservas pode ser consultada em /reservas e /reservas/disponibilidade.

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

## Entradas de estoque

O módulo usa a tabela existente `controle_estoque` e atende ao registro de compras do RF05. Administradores e funcionários podem cadastrar e consultar entradas, enviando `Authorization: Bearer TOKEN`.

| Método | Rota | Operação |
| --- | --- | --- |
| POST | /estoque | Registrar uma compra e somar a quantidade ao produto |
| GET | /estoque | Listar entradas, da data de compra mais recente para a mais antiga |
| GET | /estoque?id_produto=1 | Consultar as entradas de um produto |
| GET | /estoque/:id | Consultar uma entrada pelo identificador |

Exemplo de corpo JSON para `POST /estoque` (substitua o ID pelo de um produto cadastrado):

```json
{
  "id_produto": 1,
  "data_compra": "2026-11-14",
  "quantidade_adquirida": 24,
  "valor_total": "120.00"
}
```

Os quatro campos são obrigatórios. Quantidade deve ser um número inteiro positivo; a data deve existir e seguir AAAA-MM-DD. O valor total é o custo da compra, aceita zero conforme o banco e deve ter até dez dígitos inteiros e duas casas decimais, com ponto como separador. O ID da entrada é gerado pelo banco.

Na futura tela, o tipo e o nome exato serão selecionados pelos resultados de `GET /produtos?tipo=...&nome=...`. A entrada envia o `id_produto` selecionado; o banco já relaciona esse ID ao tipo e ao nome, sem duplicar esses campos em `controle_estoque`.

- Uma entrada de 24 unidades em um produto com saldo 10 resulta em saldo 34.
- A compra e o aumento do saldo são gravados na mesma transação: uma falha desfaz ambas as alterações. O produto fica bloqueado para alterações concorrentes durante essa operação.
- Produtos do tipo `ficha_sinuca` não aceitam entradas de estoque. Suas quantidades vendidas são registradas no módulo de vendas, sem baixa de estoque.
- O custo da compra não altera `valor_unitario`, que continua sendo o preço de venda do produto, nem cria uma despesa duplicada.
- As respostas incluem a entrada e o objeto `produto`, com ID, nome, tipo e saldo atual. Esse saldo é o da consulta, não o saldo histórico da data da compra.
- Consultas sem resultados retornam `[]`. O único filtro aceito é `id_produto`; filtros desconhecidos, vazios ou repetidos são recusados.

Respostas: 201 no cadastro; 200 nas consultas; 400 para dados inválidos ou tentativa de entrada de ficha; 404 para produto/entrada inexistente; 409 se o saldo ultrapassar o limite inteiro do banco. Falta de autenticação retorna 401. Falhas internas não expõem detalhes do banco.

O módulo de estoque permite cadastrar e consultar entradas. Edição e exclusão de entradas ficam para etapas posteriores. A baixa pelas vendas está implementada no módulo de vendas. Nenhuma alteração de tabela ou novo script SQL é necessária. Os testes automatizados continuam adiados conforme combinado.

## Registro de vendas

O módulo permite registrar vendas e consultar seu histórico, usando as tabelas existentes `venda` e `item_venda`. Administradores e funcionários acessam `POST /vendas`, `GET /vendas` e `GET /vendas/:id` com autenticação.

O servidor calcula o total, preserva o preço de cada item, exige confirmação para bebidas alcoólicas e baixa o estoque dos produtos físicos. Venda, itens e baixas são gravados juntos. Fichas registram somente quantidade vendida e valor; reservas permanecem independentes.

Consulte [o guia de vendas](docs/vendas.md) para os campos, exemplo de cadastro, respostas e limites desta etapa, incluindo a decisão de bloquear envios repetidos somente na interface.

## Reservas de mesas

O módulo usa `reserva_mesa` e `reserva_mesa_item`. Administradores e funcionários podem cadastrar, consultar, editar e cancelar reservas com uma ou várias mesas, sem gerar vendas. O cadastro e a edição bloqueiam sobreposição de horários e mesas em manutenção.

As rotas são `POST /reservas`, `GET /reservas`, `GET /reservas/:id`, `PATCH /reservas/:id` e `DELETE /reservas/:id`. A rota `GET /reservas/disponibilidade?inicio=...&fim=...` informa a disponibilidade na agenda e o estado atual de cada mesa separadamente.

Consulte [o guia de reservas](docs/reservas.md) para exemplos, horários com fuso, filtros e cancelamento. O cancelamento exclui a reserva e seus vínculos, pois o modelo atual não possui status de reserva. Não é necessário executar novo SQL.

## Registro de despesas

O módulo usa a tabela existente `despesa` e permite ao administrador registrar e consultar custos operacionais pelo `POST /despesas`, `GET /despesas` e `GET /despesas/:id`. Funcionários não têm acesso a essas rotas.

O cadastro exige tipo (`manutencao`, `energia`, `agua`, `limpeza` ou `outros`), valor positivo e data do pagamento. O responsável é definido automaticamente pelo usuário autenticado. Compras de produtos continuam em `controle_estoque`, sem gerar despesas automaticamente.

Consulte [o guia de despesas](docs/despesas.md) para o exemplo de cadastro, validações e respostas. O módulo inclui cadastro e consulta, sem edição ou exclusão. Seus valores alimentam o resumo financeiro em /relatorios/financeiro. Não é necessário executar novo SQL.

## Resumo financeiro

A rota `GET /relatorios/financeiro?inicio=2026-11-01&fim=2026-11-30` consulta receitas de vendas, compras de estoque, despesas operacionais, total de custos e resultado do período. O acesso é exclusivo do administrador autenticado.

As datas inicial e final são inclusivas. Vendas usam o horário de São Paulo; compras e despesas usam suas datas registradas. As somas são independentes e os valores monetários são devolvidos como strings com duas casas decimais. O resultado é receitas menos compras e despesas, podendo ser negativo.

A rota `GET /relatorios/financeiro/detalhado?inicio=2026-11-01&fim=2026-11-30` acrescenta as vendas, compras de estoque e despesas que compõem os totais, com acesso exclusivo do administrador.

Consulte [o guia de relatórios](docs/relatorios.md) para os campos da resposta, origem dos valores e limites desta etapa. O resumo usa apenas consultas às tabelas existentes; não exige model próprio, tabela nova ou script SQL adicional.

## Dashboard

`GET /dashboard` fornece estoque de cervejas, situação atual das mesas, reservas vigentes, vendas da noite e progresso da meta baseada na noite anterior. Administradores e funcionários podem consultar com autenticação. A tela React está disponível em /dashboard, com atualização automática e manual.

A noite vai das 19h às 5h do dia seguinte, no horário de São Paulo. Entre 5h e 19h, o painel mantém a última noite encerrada. A identificação de cervejas usa a lista de marcas em `src/dashboard/dashboard.config.js`, aceitando a marca no início do nome, sozinha ou seguida de espaço e detalhes, como Heineken 600ml. Os produtos e a tabela são preservados. Se a lista estiver vazia, esse indicador fica sem configuração e seu valor será null.

Consulte [o guia do dashboard](docs/dashboard.md) para configurar os nomes, entender as contagens e os horários e consultar o exemplo de resposta. O módulo usa somente leitura e não exige novo SQL.

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

Autenticação e permissões estão implementadas. Os dados completos dos usuários ficam restritos ao administrador. Usuários inativos não podem fazer login nem usar tokens previamente emitidos enquanto estiverem inativos. Recuperação de senha por email está implementada no backend; configure o Gmail conforme o guia abaixo.

Testes automatizados de usuarios ficaram pendentes conforme combinado. A sintaxe dos arquivos foi verificada.

## Login e permissões

Consulte [o guia de autenticação](docs/autenticacao.md) para criar o primeiro administrador, fazer login no Postman/Insomnia e revisar a matriz de permissões.

- `POST /auth/cadastro-inicial`: primeiro administrador, com a chave local no cabeçalho X-Setup-Token; bloqueado depois que já existe administrador.
- `POST /auth/login`: email e senha; devolve JWT com validade de uma hora.
- `GET /auth/me`: dados básicos do usuário autenticado.
- `POST /auth/recuperar-senha`: solicita um link de recuperação por email.
- `POST /auth/redefinir-senha`: troca a senha usando o token recebido no link.
- Rotas de negócio: enviar `Authorization: Bearer TOKEN`.
- `GET /usuarios/responsaveis`: ID e nome dos usuários ativos, disponível aos dois perfis para selecionar o responsável pela venda.

As chaves reais estão somente no `.env`, ignorado pelo Git. A estrutura do banco não foi alterada.

Consulte [o guia de recuperação de senha](docs/recuperacao-senha.md) para configurar o Gmail e integrar as futuras telas React. O link expira em 15 minutos e deixa de funcionar após a troca; a alteração da senha ou do email também invalida os JWTs de login anteriores. As credenciais SMTP devem ser preenchidas localmente antes de usar o envio.

## Frontend: acesso ao sistema

Na raiz do projeto, instale as dependências da interface com `npm --prefix web install`.
Mantenha dois terminais abertos: `npm run dev` para a API e `npm run dev:web` para o React.
Abra http://localhost:5173. Entre com uma conta já cadastrada no banco.

O frontend inclui login, solicitação de recuperação, nova senha pelo link do email e um dashboard protegido com os indicadores do bar, os dados básicos do usuário e saída. Dashboard, Produtos, Estoque, Vendas, Reservas, Despesas e Relatórios estão implementados; as telas dos demais módulos continuam para as próximas etapas. Não são exibidos dados fictícios na aplicação.

Consulte [o guia do frontend](docs/frontend.md) para estrutura, configuração e limites desta etapa. `npm run build:web` gera a interface em `web/dist`, ignorada pelo Git.

O dashboard React reúne os indicadores e os blocos de últimas vendas e estoque baixo do protótipo. Veja [o guia do dashboard](docs/dashboard.md).

A tela de [produtos](docs/produtos-web.md) está disponível em /produtos com busca, filtro, cadastro, edição e exclusão confirmada.

A tela de [estoque](docs/estoque-web.md) está disponível em /estoque para registrar compras e consultar o histórico por produto, com atualização do saldo pela API.

A tela de [vendas](docs/vendas-web.md) está disponível em /vendas para montar pedidos, registrar vendas e consultar os itens e valores históricos.

A tela de [reservas](docs/reservas-web.md), em /reservas, permite consultar disponibilidade, reservar várias mesas, editar, cancelar e atualizar a situação atual do salão.

A tela de [despesas](docs/despesas-web.md), em /despesas, permite ao administrador registrar pagamentos e consultar o histórico com o total listado.

Relatórios financeiros estão disponíveis em /relatorios para administradores, com período, resumo e detalhamento de vendas, compras e despesas. Consulte [o guia](docs/relatorios.md).
