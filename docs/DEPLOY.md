# Deploy e ambientes

## Ambientes

Use local, preview e produção. Cada ambiente deve apontar para configuração
Supabase compatível com seu risco.

## Vercel

Configure somente as variáveis públicas necessárias ao Next.js:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
STATUS_STALE_AFTER_HOURS=384
```

A página `/status` e `/api/health` nunca usam `SUPABASE_SERVICE_ROLE_KEY`.
O endpoint de máquina envia `Cache-Control: no-store`; a página pública é
revalidada a cada cinco minutos.

## GitHub Actions do scraper

Secrets obrigatórios:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

`GITHUB_SHA`, `GITHUB_RUN_ID` e `GITHUB_RUN_NUMBER` já são fornecidas pelo GitHub
e não devem ser duplicadas como secrets. O workflow define apenas
`SCRAPER_TRIGGER_SOURCE` e preserva a agenda existente (dias 1 e 15, 03:00 UTC).

O workflow fica em `.github/workflows/scraper.yml`, executa `scraper.py` e depois
`seed.py`, sem `continue-on-error`. Falha em qualquer etapa mantém o job como
falha.

## Migration

Antes do deploy do código:

1. faça backup adequado ao ambiente;
2. aplique `supabase/migrations/202607140001_scraper_runs_status.sql`;
3. execute os testes RLS em desenvolvimento;
4. faça uma execução local ou manual do workflow;
5. valide `/status` e `/api/health`.

## Checklist

- [ ] migration aplicada;
- [ ] RLS e grants verificados;
- [ ] variáveis públicas na Vercel;
- [ ] secrets do scraper somente no GitHub Actions;
- [ ] `/api/health` retorna `200` com banco acessível;
- [ ] indisponibilidade do banco retorna `503` sem detalhes;
- [ ] `/status` exibe datas em `America/Bahia`;
- [ ] nenhuma chave em logs, bundle ou artefatos.
