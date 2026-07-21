# RLS e grants

| Recurso | RLS | anon SELECT | anon escrita direta | RPC pública | service_role |
|---|---:|---:|---:|---:|---:|
| `disciplinas` | sim | sim | não | não | CRUD |
| `turmas` | sim | sim | não | não | CRUD |
| `links` | sim | somente ativos | não | cadastro/denúncia controlados | CRUD |
| `link_reports` | sim | não | não | inserção interna pela RPC | CRUD |
| `scraper_runs` | sim | não | não | apenas resumo público existente | CRUD |
| `abuse_events` | sim | não | não | uso interno das RPCs | CRUD |

RLS e grants são aplicados em conjunto. `anon` e `authenticated` não recebem `INSERT`, `UPDATE` ou `DELETE` em `links`, nem acesso direto às tabelas internas. Funções recebem `EXECUTE` somente quando fazem parte da API pública controlada.

Valide com `supabase/tests/phase2_security_rls.sql` em desenvolvimento.
