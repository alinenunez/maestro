# Recuperação de senha por email

O backend atende ao RF03 com duas rotas públicas. O usuário recebe um link no email cadastrado, escolhe uma nova senha e faz login novamente. O envio usa Nodemailer e Gmail. Não há alteração de tabela nem script SQL para executar.

## Configurar o Gmail

No `.env` local, os dados públicos de conexão já estão preenchidos:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
RESET_PASSWORD_URL=http://localhost:5173/redefinir-senha
```

1. Ative a verificação em duas etapas na conta Google que enviará as mensagens.
2. Acesse [Senhas de app](https://myaccount.google.com/apppasswords) e crie uma para o Sistema Maestro.
3. Preencha `SMTP_USER` e `EMAIL_FROM` com esse mesmo endereço Gmail completo.
4. Em `SMTP_PASSWORD`, coloque a senha de app gerada, sem os espaços de apresentação. Não use a senha normal da conta Google nem envie essa credencial pelo chat.
5. Reinicie o servidor após alterar o `.env`.

Senhas de app exigem verificação em duas etapas e podem não estar disponíveis em algumas contas institucionais ou com Proteção Avançada. A troca da senha da conta Google revoga suas senhas de app. Consulte a [orientação oficial do Google](https://support.google.com/accounts/answer/185833?hl=pt-BR).

A porta 587 usa STARTTLS: `SMTP_SECURE=false` inicia a conexão sem TLS implícito, mas `requireTLS: true` exige a negociação de criptografia antes da autenticação. Não significa envio sem proteção. Referências: [configuração SMTP do Gmail](https://support.google.com/mail/answer/7104828) e [transporte SMTP do Nodemailer](https://nodemailer.com/smtp).

`RESET_PASSWORD_URL` é o endereço da futura página React para definir a nova senha. O servidor aceita HTTPS ou HTTP apenas em localhost/127.0.0.1/IPv6 local. Não inclua parâmetros, fragmento ou credenciais nesse valor. O backend acrescenta `#token=...` ao link. Em produção, substitua pelo endereço HTTPS da aplicação. A página React ainda será implementada.

O `.env` continua ignorado pelo Git; `.env.example` contém somente configurações públicas e campos vazios para credenciais.

## Solicitar o link

Envie `POST /auth/recuperar-senha`, sem JWT, com `Content-Type: application/json`:

```json
{"email": "funcionario@example.com"}
```

Com configuração de email preenchida e requisição válida, a resposta é HTTP 202:

```json
{"mensagem": "Se houver uma conta ativa com este email, voce recebera as instrucoes de recuperacao."}
```

A resposta é igual para email existente, inexistente ou usuário inativo. Ela não devolve o token nem confirma a existência da conta. O email é normalizado para minúsculas e sem espaços nas extremidades.

A consulta e o envio são agendados depois da resposta; somente contas ativas de administrador ou funcionário recebem instruções. HTTP 202 confirma a aceitação do pedido, não a entrega da mensagem. O link dura 15 minutos desde a emissão. Falta de configuração retorna 503 para qualquer email.

## Definir a nova senha

A futura página lê `token` do fragmento da URL e envia `POST /auth/redefinir-senha`, sem JWT de login:

```json
{
  "token": "TOKEN_RECEBIDO_NO_LINK",
  "senha": "NovaSenhaEscolhida",
  "confirmacao_senha": "NovaSenhaEscolhida"
}
```

Resposta HTTP 200:

```json
{"mensagem": "Senha redefinida com sucesso. Entre novamente no sistema."}
```

A senha segue a validação atual do cadastro: não pode ser vazia, deve corresponder à confirmação e ter até 72 bytes em UTF-8. A API grava somente o hash bcrypt. Não faz login automaticamente e agenda um email de aviso após a alteração.

Para integrar o React, use `new URLSearchParams(window.location.hash.slice(1)).get("token")`. Mantenha o token apenas na memória da página e remova o fragmento com `history.replaceState` após a leitura. Não o coloque em logs ou armazenamento persistente. O fragmento evita enviá-lo ao servidor da página; a requisição de redefinição o envia no corpo JSON. Ainda falta construir as telas de solicitação e nova senha.

## Validade e sessões

- O token de recuperação tem assinatura própria, finalidade e destinatário diferentes do JWT de login. Um não substitui o outro.
- A assinatura depende de `JWT_SECRET`, do usuário, do email cadastrado e do hash atual da senha. O hash não aparece no token nem na resposta.
- A atualização exige que o hash e o email continuem iguais aos usados na validação e que a conta esteja ativa. Se duas redefinições concorrerem, apenas uma pode gravar a mudança.
- Após a troca, o link usado e outros links anteriores deixam de funcionar. Solicitar outro link, sozinho, não invalida os anteriores: eles continuam válidos até a expiração ou uma alteração de senha/email.
- Os JWTs de login também verificam uma assinatura derivada da credencial atual. Trocar a senha ou o email invalida as sessões anteriores, inclusive quando o administrador faz a alteração pelo cadastro. Tokens de login emitidos antes desta implementação exigem novo login.
- Usuários inativos são recusados no login, na redefinição e nas rotas protegidas enquanto estiverem inativos.

## Respostas e limites

| Situação | HTTP |
| --- | --- |
| Solicitação válida, configuração presente | 202 |
| Senha redefinida | 200 |
| Dados inválidos, senha divergente, token inválido/expirado/já usado | 400 |
| Limite de tentativas excedido | 429 |
| Configuração de email ausente ou inválida | 503 |
| Falha interna durante a redefinição | 500 |

Solicitações: até 10 por IP a cada 15 minutos e 3 por email normalizado por hora. Redefinições: até 10 por IP a cada 15 minutos. Os limites contam tentativas, inclusive inválidas, e não dependem da existência de uma conta. O contador por email usa seu resumo SHA-256. Os contadores ficam em memória e reiniciam com o processo; a configuração atual atende à execução local com um servidor.

O envio em segundo plano não possui fila persistente nem nova tentativa automática. Se o processo encerrar antes de enviar, ou o Gmail recusar o envio, será necessário solicitar outro link. Falhas registram uma mensagem genérica no terminal, sem email, token, senha ou resposta detalhada do provedor. Falha no aviso de senha alterada não desfaz a troca já concluída.

## Conferência desta etapa

A sintaxe e o fluxo local foram conferidos com conta e envio simulados, sem modificar usuários reais ou enviar mensagens. A suíte automatizada do projeto continua adiada conforme combinado. O envio real pelo Gmail depende de preencher as credenciais e verificar a chegada do email; o fluxo pela interface depende das telas React.
