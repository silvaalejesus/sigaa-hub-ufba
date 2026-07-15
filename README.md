# SIGAA Hub UFBA

Plataforma colaborativa para localizar turmas do semestre vigente e compartilhar links de grupos de WhatsApp.

> Projeto independente, sem vínculo oficial com a Universidade Federal da Bahia, com o SIGAA ou com a Meta/WhatsApp.

## Estado do projeto

O projeto está em desenvolvimento. A aplicação possui base em Next.js, integração com Supabase, componentes de interface, scraper isolado e deploy na Vercel. A primeira etapa de observabilidade do front-end inclui Sentry, Vercel Analytics e Vercel Speed Insights.

## Tecnologias

- Next.js e React
- TypeScript
- Tailwind CSS e Shadcn UI
- React Hook Form e Valibot
- Supabase/PostgreSQL com RLS
- Python e Playwright
- Vercel
- Sentry

## Desenvolvimento local

Consulte [SETUP.md](./SETUP.md) para as instruções de ambiente e [docs/DEPLOY.md](./docs/DEPLOY.md) para Preview e Production.

Comandos principais:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Copie o arquivo de exemplo antes de iniciar:

```bash
cp .env.example .env.local
```

A coleta do Sentry fica desativada em ambiente local por padrão.

## Regras centrais

- leitura pública;
- somente links `https://chat.whatsapp.com/`;
- um link ativo por turma;
- denúncia com motivo entre 10 e 150 caracteres;
- desativação automática no terceiro reporte;
- exibição apenas do semestre vigente.

## Observabilidade

- erros de navegador, servidor, Edge Runtime, navegação e App Router com Sentry;
- captura apenas de falhas inesperadas nas Server Actions;
- sanitização de dados sensíveis antes do envio;
- traces com taxa configurável e conservadora;
- source maps preparados para builds de produção;
- Vercel Analytics preservado;
- Vercel Speed Insights incluído;
- Session Replay desativado.

Consulte [docs/OBSERVABILITY.md](./docs/OBSERVABILITY.md) para configuração, privacidade e validação.

## Documentação

- [Arquitetura](./docs/ARCHITECTURE.md)
- [Front-end](./docs/FRONTEND.md)
- [Back-end](./docs/BACKEND.md)
- [Banco de dados](./docs/DATABASE.md)
- [RLS](./docs/RLS.md)
- [Segurança](./docs/SECURITY.md)
- [Observabilidade](./docs/OBSERVABILITY.md)
- [Deploy](./docs/DEPLOY.md)
- [Scraper](./docs/SCRAPER.md)
- [Testes](./docs/TESTING.md)
- [Roadmap](./docs/ROADMAP.md)
- [Decisões arquiteturais](./docs/adr/)

## Contribuição

Leia `CONTRIBUTING.md` e `AGENTS.md`, quando presentes na versão do repositório em uso, antes de alterar o projeto.

## Licença

A licença ainda deve ser escolhida explicitamente pela mantenedora. Consulte `LICENSE_GUIDE.md`.
