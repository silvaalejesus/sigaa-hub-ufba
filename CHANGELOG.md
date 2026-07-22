# Changelog

## 2026-07-17 — Fase 2

- migração de hospedagem da Vercel/Cloudflare para Netlify;
- remoção de Vercel Analytics e Speed Insights;
- unicidade de link ativo por turma no PostgreSQL;
- cadastro e denúncia por RPCs transacionais;
- rate limiting persistente e fingerprint HMAC;
- honeypots nos formulários públicos;
- revisão de RLS/grants;
- sanitização de logs/Sentry;
- headers de segurança e CSP Report-Only;
- testes SQL e testes puros de segurança.

<!-- post-phase2-functional-fixes-2026-07-21 -->
## 2026-07-21 — correções pós-Fase 2

- RPC de denúncia agora retorna status, contagem e estado final;
- cadastro diferencia link ativo de URL histórica repetida;
- nova contagem pública de denúncias e confirmação específica na terceira;
- atualização imediata por estado local e `router.refresh()`;
- scroll lock reutilizável para overlays;
- feedback real via Netlify Forms e contadores digitados/máximo;
- testes SQL, unitários e documentação atualizados.
