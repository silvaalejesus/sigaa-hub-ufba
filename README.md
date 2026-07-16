# SIGAA Hub UFBA

Plataforma colaborativa para localizar turmas do semestre vigente e compartilhar
links de grupos de WhatsApp.

> Projeto independente, sem vínculo oficial com a Universidade Federal da Bahia,
> com o SIGAA ou com a Meta/WhatsApp.

## Estado do projeto

A aplicação usa Next.js, Supabase, scraper Python/Playwright e deploy na Vercel.
A infraestrutura pública de status está disponível em `/status`, com health
check mínimo em `/api/health`. O scraper registra extração e sincronização em
`public.scraper_runs`.

## Desenvolvimento local

Consulte [`SETUP.md`](./SETUP.md) e [`docs/DEPLOY.md`](./docs/DEPLOY.md).

```bash
pnpm install
pnpm dev
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
python -m compileall scraper
python -m unittest discover -s scraper/tests
```

## Banco

Aplique primeiro o schema existente e depois as migrations versionadas. Para o
status operacional:

```text
supabase/migrations/202607140001_scraper_runs_status.sql
```

## Rotas operacionais

- `/status`: estado público, contagens do semestre e última sincronização;
- `/api/health`: payload mínimo para monitoramento de disponibilidade.

## Documentação

- [Arquitetura](./docs/ARCHITECTURE.md)
- [Banco de dados](./docs/DATABASE.md)
- [RLS](./docs/RLS.md)
- [Observabilidade](./docs/OBSERVABILITY.md)
- [Scraper](./docs/SCRAPER.md)
- [Deploy](./docs/DEPLOY.md)
- [Roadmap](./docs/ROADMAP.md)

## Contribuição

Leia [`CONTRIBUTING.md`](./CONTRIBUTING.md) e [`AGENTS.md`](./AGENTS.md).
