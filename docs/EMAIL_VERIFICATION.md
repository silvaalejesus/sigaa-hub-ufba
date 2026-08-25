# Verificação de e-mail — Turnstile + Resend

Este fluxo protege o cadastro de grupos sem adicionar login/cadastro.

## Fluxo

1. usuário informa nome, matrícula, e-mail e link do WhatsApp;
2. Cloudflare Turnstile gera um token antirobô;
3. o backend valida o token no Siteverify;
4. o backend aplica rate limit por visitante e por hash/HMAC do e-mail;
5. Resend envia um link de confirmação válido por 30 minutos;
6. o link abre `/verificar-email`;
7. a pessoa precisa clicar em **Confirmar e-mail e publicar grupo**;
8. somente então `add_link_secure` publica o grupo e grava `private.link_submissions`;
9. a notificação administrativa `sigaa-hub-link-added` é enviada pelo Netlify Forms.

Não é criada tabela de pendências e não existe rotina de limpeza de tokens. O token é criptografado, autenticado e carrega sua própria expiração.

## `public/__forms.html`

Este patch **não altera** `public/__forms.html`.

Os formulários existentes continuam sendo:

- `sigaa-hub-feedback`
- `sigaa-hub-link-added`

Se eles já aparecem em **Netlify > Forms** e as notificações por e-mail já foram configuradas, não precisa recriar nada. Se o arquivo ainda não foi implantado desde o patch anterior, faça um deploy com **Form detection** habilitado para o Netlify detectar esses formulários.

A notificação `sigaa-hub-link-added` passa a acontecer somente depois que o usuário confirma o e-mail e o grupo é realmente publicado.

## 1. Cloudflare Turnstile

Crie um widget do tipo **Managed** no painel do Turnstile e adicione os hostnames reais do site.

No Netlify configure:

```text
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key pública>
TURNSTILE_SECRET_KEY=<secret key privada>
TURNSTILE_EXPECTED_HOSTNAMES=seu-dominio.com,seu-site.netlify.app
```

Para desenvolvimento local você pode usar as chaves oficiais de teste da Cloudflare:

```text
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Não use as chaves de teste em produção.

## 2. Resend

Para enviar confirmações para usuários reais, verifique no Resend um domínio ou subdomínio que você controla.

Depois configure no Netlify:

```text
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=SIGAA Hub UFBA <no-reply@mail.seudominio.com>
```

O domínio de `RESEND_FROM_EMAIL` precisa estar verificado no Resend. O domínio `resend.dev` serve somente para testes limitados.

## 3. Segredo dos tokens

Gere um segredo aleatório, por exemplo:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Salve somente no Netlify:

```text
EMAIL_VERIFICATION_SECRET=<valor gerado>
```

Não coloque esse segredo em `NEXT_PUBLIC_*`, GitHub ou código-fonte.

## 4. Supabase: chave de backend

O fluxo final de publicação deixa `add_link_secure` inacessível para `anon` e `authenticated`, evitando que alguém contorne a confirmação chamando a Data API diretamente.

Use uma chave de backend do Supabase:

```text
SUPABASE_SECRET_KEY=sb_secret_...
```

A chave `sb_secret_...` é preferida. Se o projeto ainda estiver usando apenas chaves legadas, o código aceita como fallback:

```text
SUPABASE_SERVICE_ROLE_KEY=...
```

Essas chaves bypassam RLS e **nunca podem ir para o navegador**.

## 5. URL pública

Configure a URL que deve aparecer nos e-mails:

```text
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com
```

## 6. Aplicar a migration

A migration nova é:

```text
supabase/migrations/20260819180000_email_verification_turnstile_resend.sql
```

Ela:

- adiciona `email_verified_at` em `private.link_submissions`;
- mantém `identity_verified`, mas documenta que `true` significa apenas e-mail confirmado;
- cria `request_link_email_verification_secure` para rate limit/pré-validação;
- restringe essa RPC ao backend privilegiado;
- restringe `add_link_secure` ao backend privilegiado;
- faz `add_link_secure` registrar `identity_verified = true` e `email_verified_at = now()`;
- não cria tabela de pendências;
- não cria rotina de limpeza de PII.

Execute na raiz:

```powershell
pnpm supabase db push --dry-run
pnpm supabase db push
```

## 7. Ordem recomendada para produção

1. criar/configurar Turnstile;
2. verificar o domínio no Resend e criar a API key;
3. configurar todas as variáveis no Netlify;
4. rodar `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build`;
5. rodar `pnpm supabase db push`;
6. fazer o deploy de produção logo em seguida.

A migration revoga o acesso anônimo à RPC final. Entre o `db push` e o novo deploy, o formulário antigo pode deixar de cadastrar grupos. Por isso faça os dois passos em sequência.

## 8. Teste de ponta a ponta

- abra o formulário de uma turma sem grupo;
- preencha nome, matrícula, e-mail e link;
- complete o Turnstile;
- envie;
- confirme que o grupo **ainda não aparece**;
- abra o e-mail recebido;
- clique no link;
- na página do SIGAA Hub, clique em **Confirmar e-mail e publicar grupo**;
- confirme que o grupo passou a aparecer;
- consulte `private.link_submissions` e valide:
  - `identity_verified = true`;
  - `email_verified_at` preenchido;
- confirme a notificação administrativa no Netlify Forms;
- tente reutilizar o link: a unicidade da turma deve impedir nova publicação;
- teste token expirado e Turnstile inválido.

## 9. Rate limit

A solicitação de e-mail usa:

- até 5 solicitações por hora por fingerprint de visitante;
- até 3 solicitações por hora por fingerprint/HMAC do e-mail.

O e-mail em texto puro não é gravado em `public.abuse_events`.
