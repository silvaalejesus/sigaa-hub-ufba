# Row Level Security

## Princípios

- leitura pública apenas dos dados necessários;
- links públicos somente quando ativos;
- nenhuma operação privilegiada pelo navegador;
- service role somente no scraper e em CI/backend controlado;
- funções `security definer` com `search_path` fixo e grants explícitos.

## Execuções do scraper

RLS está ativa em `public.scraper_runs`. Não existe policy para `anon` nem para
`authenticated`, e os grants da tabela são revogados desses papéis. Somente
`service_role` recebe `SELECT`, `INSERT`, `UPDATE` e `DELETE`.

A aplicação pública nunca consulta a tabela diretamente. Ela executa funções
RPC que retornam apenas:

- status e horários do último run;
- última sincronização bem-sucedida;
- duração agregada;
- contagens do semestre;
- booleano do health check.

As funções não retornam `error_message`, `metadata`, `trigger_source`, commit ou
ID do workflow. O uso de `security definer` é restrito por:

- `set search_path = public, pg_temp`;
- nomes de tabela qualificados;
- `REVOKE ALL ... FROM PUBLIC`;
- `GRANT EXECUTE` apenas para `anon`, `authenticated` e `service_role`.

## Testes

`supabase/tests/scraper_runs_rls.sql` executa uma transação que confirma:

- `anon` não lê nem insere na tabela bruta;
- `anon` executa a RPC segura;
- `service_role` insere, atualiza e remove;
- o contrato público não contém colunas operacionais restritas.

Execute somente em banco local/de desenvolvimento:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/scraper_runs_rls.sql
```
