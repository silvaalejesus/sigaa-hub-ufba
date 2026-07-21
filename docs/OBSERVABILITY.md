# Observabilidade

## Sentry

O Sentry permanece na aplicação e no scraper. DSNs são configurados por ambiente; não há DSN hardcoded. `beforeSend`, transações e breadcrumbs removem URLs de WhatsApp, IPs, fingerprints, tokens, cookies, headers, bodies, query strings e dados de formulário.

Erros funcionais como validação, duplicidade, rate limit, honeypot, recurso inexistente e link inativo não são enviados como exceções críticas. Falhas inesperadas recebem somente operação, subsistema e códigos técnicos seguros.

## Analytics

`@vercel/analytics` e `@vercel/speed-insights` foram removidos porque o front-end migrou da Vercel para o Netlify. Nenhum GA4, GTM, AdOpt ou substituto foi introduzido na Fase 2.

## Logs

Não registrar URL integral de grupo, motivo, formulário, IP, fingerprint completo, cookies, authorization, secrets, CSV ou erros SQL integrais.
