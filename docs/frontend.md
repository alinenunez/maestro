# Frontend — primeira etapa

A interface usa React, JSX, componentes de função, Hooks e CSS, seguindo a base do material 09.react.pdf. O Vite executa e gera a aplicação. O React Router organiza a navegação. Não há React Native, TypeScript ou framework de componentes nesta etapa.

## Executar no IntelliJ

Na raiz do projeto, execute uma vez `npm --prefix web install`. Em um terminal, inicie a API com `npm run dev`. Em outro, execute `npm run dev:web` e abra http://localhost:5173.

Também é possível entrar na pasta web e executar `npm run dev` nela. Cada package.json contém as dependências e comandos da sua aplicação; o lock da interface fica em web/package-lock.json.

O navegador envia as requisições para `/api`; o Vite encaminha ao Express em `http://127.0.0.1:3000`, retirando esse prefixo. Assim, as rotas existentes da API são preservadas. Se mudar a porta da API, ajuste o destino em web/vite.config.js. As portas são fixas para não mudar silenciosamente o endereço dos links de recuperação.

Não copie o .env do servidor para web. Senha do banco, chave JWT e credenciais Gmail continuam somente no backend. Esta etapa não precisa de um .env adicional no frontend.

## Estrutura

- src/main.jsx: inicia React, navegação e contexto de autenticação.
- src/App.jsx: rotas, proteção das páginas e títulos.
- src/pages: Login, RecuperarSenha, RedefinirSenha e Dashboard.
- src/components: apresentação compartilhada e campo de senha com botão mostrar/ocultar.
- src/contexts/AuthContext.jsx: usuário, token em memória, expiração, login e saída.
- src/services/api.js: chamadas fetch, erros, cancelamento e tempo limite de 15 segundos.
- src/styles.css: cores, tipografia, formulários e adaptação para celular.

O visual segue o fundo escuro/azul, formulário claro e botão em degradê do protótipo. As fontes são servidas localmente pelos pacotes @fontsource. Os formulários têm rótulos, foco visível, preenchimento automático, mensagens de erro e bloqueio do botão durante o envio.

## Fluxo

| Página | API |
| --- | --- |
| /login | POST /auth/login |
| /recuperar-senha | POST /auth/recuperar-senha |
| /redefinir-senha#token=... | POST /auth/redefinir-senha |
| /dashboard (e /inicio por redirecionamento) | GET /dashboard, exige login |

Após o login, o dashboard mostra nome e perfil reais e consulta os indicadores da API. O login agora abre /dashboard; /inicio redireciona para ele. A API continua sendo responsável pelas permissões; proteger uma rota React não substitui a autorização do servidor.

O token de login fica apenas na memória. Recarregar a página ou fechar a aba exige novo login. A expiração automática encerra a sessão; uma resposta 401 em chamada autenticada também retorna ao login. O dashboard reconsulta /dashboard ao receber foco e a cada minuto; a API valida a sessão em cada consulta. A saída descarta a sessão local, sem endpoint de logout ou revogação individual no backend.

Na redefinição, o token é lido do fragmento e removido do endereço; fica apenas na memória da página. Após recarregá-la, é preciso reabrir o link original do email. O frontend compara senha e confirmação; a API valida assinatura, validade e uso do link. Depois da troca, retorna ao login. Erros e respostas genéricas do backend são exibidos sem revelar a existência da conta na recuperação.

O envio real de emails depende das credenciais Gmail no .env do servidor. Mantenha RESET_PASSWORD_URL=http://localhost:5173/redefinir-senha para o desenvolvimento. Consulte recuperacao-senha.md.

O cadastro inicial continua pelo procedimento de docs/autenticacao.md, com a chave local de configuração. A tela de cadastro e as telas dos módulos serão feitas em etapas seguintes. O login orienta quem precisa de acesso a procurar o administrador, sem oferecer um cadastro público irrestrito.

## Build e publicação

`npm run build:web` gera web/dist. `npm run preview:web` permite conferir esse build localmente em http://localhost:4173, com proxy para a API. Os links de email continuam apontando para 5173, conforme o .env.

Nenhum site foi publicado. Em uma futura implantação, será necessário servir o build, encaminhar /api ao backend, aplicar fallback das páginas para index.html e configurar HTTPS e o endereço real dos emails. Os servidores dev e preview do Vite são para uso local.

Referências de implementação: [React Context](https://react.dev/learn/passing-data-deeply-with-context), [rotas React Router](https://reactrouter.com/start/declarative/routing) e [proxy do Vite](https://vite.dev/config/server-options#server-proxy).

A tela Dashboard e as regras dos dois perfis estão descritas em docs/dashboard.md. As demais opções do menu ficam desabilitadas até a implementação das respectivas telas.

Atualização: Produtos já está habilitado no menu do administrador, com cadastro, edição, consulta e exclusão confirmada. Consulte produtos-web.md. O cabeçalho agora é compartilhado por Dashboard e Produtos.
