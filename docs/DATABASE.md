# Banco de dados

## Modelo real

O schema atual usa:

- `public.disciplinas`: `id`, `codigo`, `nome`, `departamento`, `created_at`;
- `public.turmas`: `id`, `disciplina_id`, `codigo_turma`, `professor`,
  `semestre`, `created_at`;
- `public.links`: `id`, `turma_id`, `url_whatsapp`, `reports`, `is_active`,
  `created_at`;
- `public.link_reports`: denúncias, conforme script específico do projeto;
- `public.scraper_runs`: histórico operacional da coleta e sincronização.

O semestre segue o formato `AAAA.P`, por exemplo `2026.1`.

## `public.scraper_runs`

| Coluna | Uso |
| --- | --- |
| `id` | UUID da execução |
| `status` | `running`, `success`, `partial` ou `failed` |
| `trigger_source` | `manual`, `github_actions`, `local` ou `scheduled` |
| `semester` | semestre coletado |
| `started_at` / `finished_at` | janela da execução |
| `departments_processed` | unidades concluídas |
| `subjects_found` / `classes_found` | contagens da extração |
| `subjects_upserted` / `classes_upserted` | contagens sincronizadas |
| `error_code` | código estável e curto |
| `error_message` | erro sanitizado, limitado a 1.000 caracteres |
| `metadata` | objeto JSON operacional não sensível |
| `created_at` | criação da linha |

Constraints controlam estados, origem, formato do semestre, ordem temporal,
contadores não negativos e limites de erro. Os índices atendem última execução,
último sucesso, semestre e status.

## Interface pública

A tabela bruta não possui leitura pública. As funções abaixo expõem somente
agregados seguros:

- `get_public_scraper_status(text)`;
- `count_public_subjects(text)`;
- `count_public_classes(text)`;
- `count_public_active_links(text)`;
- `app_health_check()`.

## Aplicação da migration

Com Supabase CLI:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Ou copie `supabase/migrations/202607140001_scraper_runs_status.sql` para o SQL
Editor de um ambiente de desenvolvimento, revise e execute antes de produção.
A migration é aditiva e não remove dados existentes.
