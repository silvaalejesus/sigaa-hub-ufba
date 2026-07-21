# Arquitetura

## Visão geral

```text
Navegador
  -> Netlify CDN/OpenNext
  -> Next.js Server Actions e Route Handlers
  -> Supabase API/RPC
  -> PostgreSQL com RLS

GitHub Actions -> scraper Python/Playwright -> Supabase com service role
Sentry <- eventos inesperados sanitizados do Next.js e scraper
```

O Netlify executa o build `pnpm build`; não há adaptador Cloudflare, plugin legado do Next.js ou dependência operacional da Vercel.

## Escritas públicas

`add_link` e `report_link` seguem: validação Valibot, honeypot, IP confiável do Netlify, HMAC por escopo, RPC `SECURITY DEFINER`, rate limit persistente, resposta funcional e log sanitizado. A chave anônima chama apenas as RPCs autorizadas. Nenhuma Server Action usa service role.

## Consistência

`one_active_link_per_class` é um índice único parcial em `links(turma_id) where is_active`. A RPC de denúncia bloqueia a linha do link, insere a denúncia, incrementa o contador e desativa na terceira denúncia dentro da mesma transação.
