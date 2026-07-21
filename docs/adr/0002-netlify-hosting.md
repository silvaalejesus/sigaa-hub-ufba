# ADR 0002 — Hospedagem do front-end no Netlify

**Status:** aceito em 2026-07-17.

## Decisão

Publicar o Next.js no Netlify Free usando a integração OpenNext automática da plataforma. Remover arquivos e dependências exclusivos da Vercel e Cloudflare. Manter Supabase, GitHub Actions e scraper independentes.

## Consequências

Vercel Analytics e Speed Insights são descontinuados. O Sentry permanece. Não se configura `publish` nem plugin legado. Preview e produção devem receber as variáveis necessárias no painel do Netlify.
