# Roadmap

## Critérios

- segurança antes de escala;
- regra de negócio protegida no banco;
- entregas pequenas e verificáveis;
- observabilidade antes de funcionalidades operacionais complexas.

## Fase 0 — Base documental e integridade

- [ ] adicionar `AGENTS.md`;
- [ ] revisar e substituir o README atual;
- [ ] confirmar modelo real das migrations;
- [ ] documentar variáveis em `.env.example`;
- [ ] confirmar scripts de lint, typecheck e testes;
- [ ] escolher licença.

## Fase 1 — Observabilidade e experiência

- [ ] integrar Sentry no Next.js;
- [ ] integrar Sentry no scraper;
- [ ] confirmar Vercel Analytics no layout;
- [ ] adicionar Speed Insights;
- [ ] definir eventos de produto;
- [ ] criar página `/status`;
- [ ] registrar execução do scraper.

## Fase 2 — Segurança e consistência

- [ ] índice único parcial para um link ativo por turma;
- [ ] transação para denúncia e desativação;
- [ ] rate limiting;
- [ ] honeypot;
- [ ] revisão completa de RLS;
- [ ] sanitização de logs;
- [ ] cabeçalhos de segurança.

## Fase 3 — Importação massiva CSV

- [ ] definir layout do CSV;
- [ ] disponibilizar modelo;
- [ ] criar parser e schemas;
- [ ] construir preview;
- [ ] validação em lote no servidor;
- [ ] relatório por linha;
- [ ] eventos de analytics;
- [ ] testes unitários, integração e E2E.

Modelo sugerido:

```csv
codigo_disciplina,turma,semestre,link_whatsapp
MAT001,010100,2026.1,https://chat.whatsapp.com/EXEMPLO
```

O identificador interno pode ser aceito por integrações, mas o modelo público deve priorizar dados compreensíveis.

## Fase 4 — Qualidade operacional

- [ ] rotina de verificação de links;
- [ ] tolerância a timeouts e falsos negativos;
- [ ] painel administrativo autenticado;
- [ ] trilha de auditoria;
- [ ] métricas de cobertura por departamento;
- [ ] backups e recuperação documentados.

## Fase 5 — Evolução

- [ ] avaliar OpenTelemetry;
- [ ] avaliar backend OTEL, como SigNoz;
- [ ] feature flags;
- [ ] política de retenção de dados;
- [ ] revisão de GTM e AdOpt somente se analytics/marketing exigir.

## Fora de escopo por enquanto

- autenticação obrigatória para consulta;
- substituição do Supabase sem necessidade;
- microserviços;
- self-hosting de observabilidade;
- GTM apenas para page views;
- coleta de dados pessoais desnecessários.
