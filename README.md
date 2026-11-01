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

A pasta src/auth será usada para autenticação, com as estratégias Passport e verificações de acesso em auth.config.js, seguindo o template da aula; src/database/models, para modelos Sequelize. A conexão ficará em src/database/connection.js e o ponto de entrada será main.js na raiz. Esses arquivos serão implementados nas próximas etapas.

Os arquivos .gitkeep mantêm as pastas vazias no Git.
