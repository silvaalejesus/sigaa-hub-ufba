# Configuração local do SIGAA Hub UFBA

## Pré-requisitos

- Node.js 22;
- pnpm 10;
- Python 3.9 ou superior;
- Supabase CLI ou acesso ao SQL Editor.

## Aplicação

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Variáveis mínimas para o Next.js:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ABUSE_FINGERPRINT_SECRET=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
STATUS_STALE_AFTER_HOURS=384
```

`ABUSE_FINGERPRINT_SECRET` deve ter alta entropia e no mínimo 32 caracteres. `REPORT_FINGERPRINT_SECRET` é aceito temporariamente apenas para migração. Nenhuma dessas variáveis pode usar `NEXT_PUBLIC_`.

## Banco

```bash
pnpm supabase link --project-ref SEU_PROJECT_REF
pnpm supabase db push --dry-run
pnpm supabase db push
```

Execute primeiro em desenvolvimento e rode:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase2_security_rls.sql
```

Não use `db reset` em produção.

## Validação

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm supabase db lint
pnpm audit
```

<!-- post-phase2-functional-fixes-2026-07-21 -->
## Netlify Forms — feedback

O build inclui `public/__forms.html` para detecção estática. No painel do Netlify:

1. **Forms → Enable form detection**;
2. faça um novo deploy;
3. confirme o formulário `sigaa-hub-feedback`;
4. em **Configuration → Notifications → Form submission notifications**, adicione uma notificação por e-mail para esse formulário.

O endereço destinatário é configurado somente no painel e não deve ser commitado.
No modelo atual de planos por créditos, Forms não possui cobrança ou limite próprio. Contas antigas no Free legado podem continuar sujeitas ao modelo metered; confirme **Forms → Usage** no painel.
