# Deploy e ambientes

## Ambientes

Recomendados:

- local;
- preview;
- produção.

Cada ambiente deve usar configuração e, preferencialmente, projeto Supabase apropriado ao risco.

## Vercel

O front-end está preparado para deploy na Vercel.

Revisar:

- variáveis de ambiente;
- domínio;
- proteção de previews;
- logs;
- Analytics;
- Speed Insights;
- integração com Sentry;
- política de deploy automático.

## Variáveis

Manter um `.env.example` sem valores secretos, descrevendo:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

A lista deve ser ajustada à implementação real. Variáveis exclusivamente do scraper devem ficar documentadas no diretório do scraper.

## Migrations

- versionar migrations em `supabase/`;
- não alterar produção manualmente sem registrar migration;
- testar constraints e RLS;
- executar backup antes de mudanças destrutivas.

## Rollback

Para código, manter capacidade de promover um deployment anterior. Para banco, migrations destrutivas devem possuir estratégia explícita; rollback automático nem sempre é seguro.

## Domínio

Um domínio próprio pode apontar para a Vercel sem retirar o projeto da plataforma.

## Checklist de produção

- [ ] build aprovado;
- [ ] migrations aplicadas;
- [ ] RLS verificada;
- [ ] variáveis configuradas;
- [ ] health check validado;
- [ ] observabilidade ativa;
- [ ] nenhuma chave em logs ou bundle;
- [ ] aviso legal e privacidade revisados.
