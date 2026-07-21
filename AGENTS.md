# AGENTS.md — SIGAA Hub UFBA

## Missão

Manter uma plataforma pública, segura e simples para localizar turmas da UFBA e compartilhar um único grupo ativo por turma.

## Stack aprovada

Next.js App Router, React, TypeScript Strict, Tailwind, Shadcn UI, React Hook Form, Valibot, Supabase/PostgreSQL com RLS, Server Actions, Sentry, Python/Playwright, GitHub Actions e Netlify.

## Regras obrigatórias

1. Consulta pública sem autenticação.
2. Aceitar apenas `https://chat.whatsapp.com/`.
3. Garantir um único link ativo por turma no PostgreSQL.
4. Motivo de denúncia entre 10 e 150 caracteres.
5. A terceira denúncia válida desativa o link atomicamente.
6. Escritas públicas passam por RPCs controladas; nunca por grants diretos de `INSERT`/`UPDATE`.
7. Rate limiting persistente, honeypot e HMAC são obrigatórios nos formulários públicos.
8. Nunca armazenar IP bruto, URL de grupo em logs, motivo de denúncia em telemetria ou fingerprint integral.

## Convenções

- Server Components por padrão e `use client` somente nas folhas interativas.
- Validação no cliente e no servidor; o banco é a última barreira.
- Early returns e resultados discriminados.
- Erros funcionais não são exceções críticas no Sentry.
- Service role somente no scraper/CI confiável.
- Toda migration nova deve ser testada em desenvolvimento e nunca reescrever migration aplicada.

## Hospedagem e observabilidade

O front-end é publicado no Netlify. A integração automática OpenNext do Netlify não requer plugin legado nem `@opennextjs/cloudflare`. Vercel Analytics e Speed Insights não fazem parte da arquitetura atual. O Sentry permanece ativo com DSN por variável de ambiente e sanitização obrigatória.

## Validação de entrega

Executar lint, typecheck, testes, build, lint/diff do Supabase, audit, revisão de secrets e validação manual em preview.
