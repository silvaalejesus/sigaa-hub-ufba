# SIGAA Hub UFBA

Plataforma pública e colaborativa para localizar turmas do semestre vigente e compartilhar links de grupos de WhatsApp.

> Projeto independente, sem vínculo oficial com a Universidade Federal da Bahia, com o SIGAA ou com a Meta/WhatsApp.

## Arquitetura atual

- Next.js 16/React 19 no Netlify, usando o adaptador OpenNext mantido pela plataforma;
- Supabase/PostgreSQL com RLS e RPCs transacionais;
- Sentry para falhas inesperadas, com dados sensíveis redigidos;
- scraper Python/Playwright executado pelo GitHub Actions;
- `/status` e `/api/health` para estado operacional.

Vercel Analytics e Speed Insights foram descontinuados por causa da mudança de hospedagem, não por falha técnica. Não há substituto de analytics nesta fase.

## Desenvolvimento

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Consulte [SETUP.md](./SETUP.md), [docs/DEPLOY.md](./docs/DEPLOY.md) e [docs/SECURITY.md](./docs/SECURITY.md).

## Banco

Aplique migrations em ordem. A Fase 2 está em:

```text
supabase/migrations/20260717010000_phase2_security.sql
```

Ela não deve ser aplicada em produção antes de backup, revisão do saneamento de links ativos duplicados e validação em ambiente de desenvolvimento.
