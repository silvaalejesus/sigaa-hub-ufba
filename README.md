# SIGAA Hub UFBA

Plataforma colaborativa para localizar turmas do semestre vigente e compartilhar links de grupos de WhatsApp.

> Projeto independente, sem vínculo oficial com a Universidade Federal da Bahia, com o SIGAA ou com a Meta/WhatsApp.

## Estado do projeto

O projeto está em desenvolvimento. A aplicação já possui uma base em Next.js, integração com Supabase, componentes de interface, scraper isolado e deploy na Vercel. Funcionalidades de observabilidade, segurança adicional, importação CSV e administração estão documentadas no roadmap.

## Tecnologias

- Next.js e React
- TypeScript
- Tailwind CSS e Shadcn UI
- React Hook Form e Valibot
- Supabase/PostgreSQL com RLS
- Python e Playwright
- Vercel

## Desenvolvimento local

Consulte [`SETUP.md`](./SETUP.md) para as instruções atualmente mantidas no repositório e [`docs/DEPLOY.md`](./docs/DEPLOY.md) para ambientes e deploy.

Comandos principais:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm build
```

## Regras centrais

- leitura pública;
- somente links `https://chat.whatsapp.com/`;
- um link ativo por turma;
- denúncia com motivo entre 10 e 150 caracteres;
- desativação automática no terceiro reporte;
- exibição apenas do semestre vigente.

## Documentação

- [Arquitetura](./docs/ARCHITECTURE.md)
- [Front-end](./docs/FRONTEND.md)
- [Back-end](./docs/BACKEND.md)
- [Banco de dados](./docs/DATABASE.md)
- [RLS](./docs/RLS.md)
- [Segurança](./docs/SECURITY.md)
- [Observabilidade](./docs/OBSERVABILITY.md)
- [Scraper](./docs/SCRAPER.md)
- [Testes](./docs/TESTING.md)
- [Roadmap](./docs/ROADMAP.md)
- [Decisões arquiteturais](./docs/adr/README.md)

## Contribuição

Leia [`CONTRIBUTING.md`](./CONTRIBUTING.md) e [`AGENTS.md`](./AGENTS.md) antes de alterar o projeto.

## Licença

A licença ainda deve ser escolhida explicitamente pela mantenedora. Consulte `LICENSE_GUIDE.md`.
