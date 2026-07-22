# Roadmap

## Fase 0 — Base documental

- [x] documentação arquitetural inicial;
- [x] variáveis de ambiente exemplificadas;
- [ ] escolher licença.

## Fase 1 — Observabilidade e status — concluída

- [x] Sentry no Next.js;
- [x] Sentry no scraper;
- [x] página `/status`;
- [x] endpoint `/api/health`;
- [x] registro das execuções do scraper;
- [x] testes e RLS do status.

Vercel Analytics e Speed Insights foram implementados na hospedagem anterior e posteriormente descontinuados devido à migração para o Netlify. A remoção não representa falha técnica. Eventos de produto continuam pendentes e não foram substituídos por GA4/GTM nesta fase.

## Fase 2 — Segurança e consistência

- [x] índice único parcial para um link ativo por turma;
- [x] saneamento determinístico de duplicados sem exclusão;
- [x] cadastro de link por RPC transacional;
- [x] denúncia, incremento e desativação em uma transação;
- [x] rate limiting persistente no Supabase;
- [x] fingerprint HMAC sem IP bruto;
- [x] honeypot nos formulários de cadastro e denúncia;
- [x] revisão de RLS e grants;
- [x] sanitização de logs e Sentry;
- [x] headers de segurança e CSP Report-Only;
- [x] migração documental e técnica para Netlify;
- [x] migrations e testes automatizados adicionados.

A marcação pressupõe aplicação da migration e validação final no preview antes do merge em produção.

## Fase 3 — Importação CSV — não iniciada

- [ ] layout e modelo de CSV;
- [ ] preview e parser;
- [ ] validação em lote;
- [ ] relatório por linha.

## Fases futuras

Verificação de links, painel autenticado, trilha administrativa e avaliação futura de OpenTelemetry permanecem fora da Fase 2.

<!-- post-phase2-functional-fixes-2026-07-21 -->
## Correções pós-Fase 2

Esta rodada corrige consistência, retorno visual, scroll de overlays e envio de feedback. Ela não inicia nem antecipa a Fase 3.
