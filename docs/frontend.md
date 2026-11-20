# Frontend — interface do Sistema Maestro

A interface usa React, JSX, componentes de função, Hooks e CSS, seguindo a base do material 09.react.pdf. O Vite executa e gera a aplicação. O React Router organiza a navegação. Não há React Native, TypeScript ou framework de componentes nesta etapa.

## Executar no IntelliJ

Na raiz do projeto, execute uma vez `npm --prefix web install`. Em um terminal, inicie a API com `npm run dev`. Em outro, execute `npm run dev:web` e abra http://localhost:5173.

Também é possível entrar na pasta web e executar `npm run dev` nela. Cada package.json contém as dependências e comandos da sua aplicação; o lock da interface fica em web/package-lock.json.

O navegador envia as requisições para `/api`; o Vite encaminha ao Express em `http://127.0.0.1:3000`, retirando esse prefixo. Assim, as rotas existentes da API são preservadas. Se mudar a porta da API, ajuste o destino em web/vite.config.js. As portas são fixas para não mudar silenciosamente o endereço dos links de recuperação.

Não copie o .env do servidor para web. Senha do banco, chave JWT e credenciais Gmail continuam somente no backend. Esta etapa não precisa de um .env adicional no frontend.

## Estrutura

- src/main.jsx: inicia React, navegação e contexto de autenticação.
- src/App.jsx: rotas, proteção das páginas e títulos.
- src/pages: Login, CadastroInicial, RecuperarSenha, RedefinirSenha, Dashboard, Produtos, Estoque, Vendas, Reservas, Despesas, Relatórios e Funcionários.
- src/components: apresentação compartilhada e campo de senha com botão mostrar/ocultar.
- src/contexts/AuthContext.jsx: usuário, token em memória, expiração, login e saída.
- src/services/api.js: chamadas fetch, erros, cancelamento e tempo limite de 15 segundos.
- src/styles.css: cores, tipografia, formulários e adaptação para celular.

O visual segue o fundo escuro/azul, formulário claro e botão em degradê do protótipo. As fontes são servidas localmente pelos pacotes @fontsource. Os formulários têm rótulos, foco visível, preenchimento automático, mensagens de erro e bloqueio do botão durante o envio.

## Fluxo

| Página | API |
| --- | --- |
| /login | POST /auth/login |
| /cadastro-inicial | POST /auth/cadastro-inicial, com chave de configuração |
| /recuperar-senha | POST /auth/recuperar-senha |
| /redefinir-senha#token=... | POST /auth/redefinir-senha |
| /dashboard (e /inicio por redirecionamento) | GET /dashboard, exige login |
| /produtos | GET, POST, PATCH e DELETE /produtos (escrita somente para administrador) |
| /estoque | GET /produtos, GET /estoque, POST /estoque (ambos os perfis) |
| /vendas | GET /produtos, GET /usuarios/responsaveis, GET /vendas, GET /vendas/:id e POST /vendas (ambos os perfis) |
| /reservas | GET, POST, PATCH e DELETE /reservas; GET /reservas/disponibilidade; consulta e status das mesas (ambos os perfis) |
| Gerenciar mesas, dentro de /reservas | POST, PATCH e DELETE /mesas (administrador) |
| /despesas | GET, POST, PATCH e DELETE /despesas (administrador) |
| /relatorios | GET /relatorios/financeiro/detalhado (administrador) |
| /funcionarios | GET, POST e PATCH /usuarios (administrador) |

Após o login, o dashboard mostra nome e perfil reais e consulta os indicadores da API. O login agora abre /dashboard; /inicio redireciona para ele. A API continua sendo responsável pelas permissões; proteger uma rota React não substitui a autorização do servidor.

O token de login fica apenas na memória. Recarregar a página ou fechar a aba exige novo login. A expiração automática encerra a sessão; uma resposta 401 em chamada autenticada também retorna ao login. O dashboard reconsulta /dashboard ao receber foco e a cada minuto; a API valida a sessão em cada consulta. A saída descarta a sessão local, sem endpoint de logout ou revogação individual no backend.

Na redefinição, o token é lido do fragmento e removido do endereço; fica apenas na memória da página. Após recarregá-la, é preciso reabrir o link original do email. O frontend compara senha e confirmação; a API valida assinatura, validade e uso do link. Depois da troca, retorna ao login. Erros e respostas genéricas do backend são exibidos sem revelar a existência da conta na recuperação.

O envio real de emails depende das credenciais Gmail no .env do servidor. Mantenha RESET_PASSWORD_URL=http://localhost:5173/redefinir-senha para o desenvolvimento. Consulte recuperacao-senha.md.

O cadastro de administradores está disponível em /cadastro-inicial pelo link na tela de login. Exige a chave de configuração e permite cadastrar mais de um administrador; a tela de Funcionários continua cadastrando somente funcionários. Consulte docs/autenticacao.md.

## Build e publicação

`npm run build:web` gera web/dist. `npm run preview:web` permite conferir esse build localmente em http://localhost:4173, com proxy para a API. Os links de email continuam apontando para 5173, conforme o .env.

Nenhum site foi publicado. Em uma futura implantação, será necessário servir o build, encaminhar /api ao backend, aplicar fallback das páginas para index.html e configurar HTTPS e o endereço real dos emails. Os servidores dev e preview do Vite são para uso local.

Referências de implementação: [React Context](https://react.dev/learn/passing-data-deeply-with-context), [rotas React Router](https://reactrouter.com/start/declarative/routing) e [proxy do Vite](https://vite.dev/config/server-options#server-proxy).

A tela Dashboard e as regras dos dois perfis estão descritas em docs/dashboard.md. Todos os módulos listados estão disponíveis; Funcionários, Despesas e Relatórios aparecem somente para administradores.

Produtos está habilitado para os dois perfis: administrador cadastra, edita e exclui; funcionário consulta. Estoque permite registrar compras e consultar o histórico nos dois perfis. Consulte produtos-web.md e estoque-web.md. Vendas permite montar pedidos, finalizar e consultar vendas nos dois perfis; consulte vendas-web.md. O cabeçalho e a navegação são compartilhados pelas telas de gestão.

Reservas também está habilitado no menu dos dois perfis, compartilhando o cabeçalho. Usa GET/POST/PATCH/DELETE /reservas, GET /reservas/disponibilidade, GET /mesas e PATCH /mesas/:id. Consulte reservas-web.md.

Despesas está disponível em /despesas somente para administradores: cadastro, consulta, edição e exclusão com confirmação, usando GET/POST/PATCH/DELETE /despesas. O histórico e o total listado são recarregados após alterações. Consulte despesas-web.md.

Relatórios financeiros estão disponíveis em /relatorios para administradores, com período, resumo e detalhamento de vendas, compras e despesas. Consulte relatorios.md.

Funcionários está disponível em /funcionarios para administradores: busca, filtro de situação, cadastro, consulta, edição e inativação/reativação. Consulte funcionarios-web.md.

## Gerenciamento de mesas

Em Reservas, o administrador pode abrir Gerenciar mesas no bloco Situação atual do salão. É possível cadastrar número e situação inicial, alterar somente o número e excluir com confirmação. Usa as rotas existentes POST /mesas, PATCH /mesas/:id e DELETE /mesas/:id. O funcionário continua apenas consultando e alterando a situação atual.

O número deve ser inteiro positivo até 2147483647 e não pode repetir outro cadastro. A API confirma a unicidade e impede exclusão de mesas com reservas vinculadas. Não se excluem reservas automaticamente. Renumerar mantém o ID e os vínculos das reservas. A situação atual é alterada pelos controles já existentes do salão.

Após uma alteração, a lista e a agenda são atualizadas e a consulta de disponibilidade anterior é invalidada. Durante o envio os controles de gerenciamento e situação ficam bloqueados. Se a gravação não puder ser confirmada, a tela exige conferir a lista antes de iniciar outra operação. Não houve mudança no banco ou no backend.
