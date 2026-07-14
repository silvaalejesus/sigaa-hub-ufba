# ADR 0002 — Sentry como observabilidade inicial

- Estado: Aceita
- Data: 2026-07-13

## Contexto

O projeto precisa diagnosticar falhas no Next.js, Server Actions, Supabase e scraper. SigNoz oferece observabilidade ampla, mas seu uso gratuito normalmente envolve operação self-hosted e instrumentação OpenTelemetry.

## Decisão

Adotar Sentry como ferramenta inicial de monitoramento de erros. Usar Vercel Analytics para produto, Speed Insights para Web Vitals e Supabase Logs para banco.

## Consequências

- implantação inicial mais simples;
- diagnóstico orientado a aplicação;
- várias ferramentas especializadas;
- OpenTelemetry e SigNoz permanecem opções futuras.
