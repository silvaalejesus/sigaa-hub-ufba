# Checklist de lançamento — SIGAA Hub UFBA

## Alterações deste patch

- identificação administrativa de quem adiciona um link;
- PII armazenada em `private.link_submissions`, sem `SELECT` público;
- remoção da antiga assinatura de 3 parâmetros de `add_link_secure`;
- notificação de novos links via Netlify Forms;
- formulário estático `public/__forms.html` para detecção do Netlify;
- GA4 mantido no carregamento de produção sem gate de consentimento;
- denylist de analytics ampliada para matrícula e dados do responsável;
- página `/privacidade` mantida para transparência sobre o tratamento de dados;
- CSP configurável (`report-only` por padrão, `enforce` após validação);
- CI para lint, typecheck, testes e build.

## 1. Revisar o diff

```bash
git status
git diff
```

O patch não altera `package.json` nem a versão do Next.js.

## 2. Aplicar a migration

Com o projeto Supabase corretamente linked:

```bash
pnpm supabase db push
```

Revise antes o arquivo:

```text
supabase/migrations/20260818234000_link_submitter_identity.sql
```

A migration remove a assinatura pública antiga `public.add_link_secure(uuid, text, text)` e cria a versão com seis argumentos. Isso evita um caminho alternativo para cadastrar um link sem identificação.

## 3. Validar banco

No SQL Editor administrativo:

```sql
select
  s.created_at,
  s.submitter_name,
  s.submitter_registration,
  s.submitter_email,
  s.identity_verified,
  l.turma_id,
  l.url_whatsapp
from private.link_submissions as s
join public.links as l on l.id = s.link_id
order by s.created_at desc
limit 50;
```

`identity_verified` permanece `false` porque nome, matrícula e e-mail ainda são apenas declarados pelo usuário.


## 4. Configurar variáveis do Netlify

Mantenha as variáveis existentes e adicione/valide:

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
SECURITY_CSP_MODE=report-only
NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL=seu-email-de-contato@exemplo.com
```

## 5. Fazer um deploy antes de configurar notificações

Confirme em Netlify Forms que estes dois formulários foram detectados:

```text
sigaa-hub-feedback
sigaa-hub-link-added
```

## 6. Configurar e-mails de notificação

Pelo painel do Netlify, crie uma notificação de submissão por e-mail para cada formulário acima.

Ou use o script incluído no ZIP, depois do deploy:

```bash
NETLIFY_AUTH_TOKEN="seu-pat" \
NETLIFY_SITE_ID="id-do-site" \
NOTIFICATION_EMAIL="seu-email@exemplo.com" \
python configure_netlify_notifications.py
```

PowerShell:

```powershell
$env:NETLIFY_AUTH_TOKEN="seu-pat"
$env:NETLIFY_SITE_ID="id-do-site"
$env:NOTIFICATION_EMAIL="seu-email@exemplo.com"
python .\configure_netlify_notifications.py
```

## 7. Validar aplicação

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Teste em preview/produção:

1. abra a home e confirme que o GA4 carrega em produção quando há um Measurement ID válido;
2. cadastre um grupo com dados de teste;
3. confirme a linha em `private.link_submissions`;
4. confirme a submissão `sigaa-hub-link-added` no Netlify;
5. confirme o e-mail de novo link;
6. envie feedback e confirme o e-mail correspondente;
7. verifique que nome, matrícula e e-mail não aparecem no GA4, Sentry ou logs;
8. teste rate limit e honeypot.

## 8. CSP

Comece com:

```text
SECURITY_CSP_MODE=report-only
```

Depois de revisar os relatórios/console no domínio real, altere para:

```text
SECURITY_CSP_MODE=enforce
```

Faça novo deploy e teste busca, grupos, feedback, Sentry, Supabase e GA4.


## 9. Antes de liberar o domínio

- confirmar semestre vigente e scraper;
- confirmar `/api/health` e `/status`;
- conferir `git diff` sem credenciais;
- testar mobile;
- testar link expirado/denúncia;
- verificar páginas 404/500;
- confirmar e-mail administrativo;
- conferir a página de privacidade;
- somente depois ativar CSP efetiva.
