# ADR 0003 — Sem GTM na fase inicial

- Estado: Aceita
- Data: 2026-07-13

## Contexto

O projeto precisa acompanhar acessos e uso, mas não possui requisito atual de Google Ads, remarketing ou múltiplos pixels.

## Decisão

Não adicionar Google Tag Manager na fase inicial. Usar Vercel Analytics e eventos diretos.

## Consequências

- menor complexidade;
- menor risco de tags não governadas;
- revisão necessária caso GA4, Ads ou campanhas sejam introduzidos;
- AdOpt deve ser avaliado conforme cookies e rastreadores efetivamente usados.
