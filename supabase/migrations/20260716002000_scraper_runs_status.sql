-- Registro operacional das execuções do scraper e interface pública segura de status.

create table if not exists public.scraper_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  trigger_source text not null default 'manual',
  semester text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  departments_processed integer not null default 0,
  subjects_found integer not null default 0,
  classes_found integer not null default 0,
  subjects_upserted integer not null default 0,
  classes_upserted integer not null default 0,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint scraper_runs_status_check
    check (status in ('running', 'success', 'partial', 'failed')),
  constraint scraper_runs_trigger_source_check
    check (trigger_source in ('manual', 'github_actions', 'local', 'scheduled')),
  constraint scraper_runs_semester_check
    check (semester is null or semester ~ '^[0-9]{4}\.[1-4]$'),
  constraint scraper_runs_finished_after_started_check
    check (finished_at is null or finished_at >= started_at),
  constraint scraper_runs_counters_nonnegative_check
    check (
      departments_processed >= 0
      and subjects_found >= 0
      and classes_found >= 0
      and subjects_upserted >= 0
      and classes_upserted >= 0
    ),
  constraint scraper_runs_error_code_length_check
    check (error_code is null or char_length(error_code) <= 80),
  constraint scraper_runs_error_message_length_check
    check (error_message is null or char_length(error_message) <= 1000),
  constraint scraper_runs_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

comment on table public.scraper_runs is
  'Execuções do scraper. Conteúdo operacional bruto, acessível somente por ambientes privilegiados.';
comment on column public.scraper_runs.error_message is
  'Mensagem curta e sanitizada. Não armazenar segredos, HTML, respostas integrais ou stack traces.';
comment on column public.scraper_runs.metadata is
  'Metadados operacionais não sensíveis, como commit, workflow e duração por etapa.';

create index if not exists scraper_runs_started_at_idx
  on public.scraper_runs (started_at desc);

create index if not exists scraper_runs_success_finished_at_idx
  on public.scraper_runs (finished_at desc)
  where status = 'success';

create index if not exists scraper_runs_semester_started_at_idx
  on public.scraper_runs (semester, started_at desc);

create index if not exists scraper_runs_status_started_at_idx
  on public.scraper_runs (status, started_at desc);

alter table public.scraper_runs enable row level security;

-- Não há policy pública na tabela bruta. A service role ignora RLS e é o único
-- papel usado pelo scraper em ambiente controlado.
revoke all on table public.scraper_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.scraper_runs to service_role;

create or replace function public.get_public_scraper_status(
  p_semester text default null
)
returns table (
  last_run_status text,
  last_run_semester text,
  last_run_started_at timestamptz,
  last_run_finished_at timestamptz,
  last_successful_sync_at timestamptz,
  last_successful_started_at timestamptz,
  last_successful_finished_at timestamptz,
  last_successful_duration_seconds bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with latest_run as (
    select
      sr.status,
      sr.semester,
      sr.started_at,
      sr.finished_at
    from public.scraper_runs as sr
    order by sr.started_at desc
    limit 1
  ),
  latest_success as (
    select
      sr.started_at,
      sr.finished_at
    from public.scraper_runs as sr
    where sr.status = 'success'
      and sr.finished_at is not null
      and (p_semester is null or sr.semester = p_semester)
    order by sr.finished_at desc, sr.started_at desc
    limit 1
  )
  select
    latest_run.status,
    latest_run.semester,
    latest_run.started_at,
    latest_run.finished_at,
    latest_success.finished_at,
    latest_success.started_at,
    latest_success.finished_at,
    case
      when latest_success.started_at is null or latest_success.finished_at is null then null
      else greatest(
        0,
        floor(extract(epoch from (latest_success.finished_at - latest_success.started_at)))::bigint
      )
    end
  from (select 1) as singleton
  left join latest_run on true
  left join latest_success on true;
$$;

comment on function public.get_public_scraper_status(text) is
  'Expõe somente o resumo público do último scraper e da última sincronização bem-sucedida.';

create or replace function public.count_public_subjects(p_semester text)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(distinct d.id)::bigint
  from public.disciplinas as d
  inner join public.turmas as t on t.disciplina_id = d.id
  where t.semestre = p_semester;
$$;

create or replace function public.count_public_classes(p_semester text)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::bigint
  from public.turmas as t
  where t.semestre = p_semester;
$$;

create or replace function public.count_public_active_links(p_semester text)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::bigint
  from public.links as l
  inner join public.turmas as t on t.id = l.turma_id
  where t.semestre = p_semester
    and l.is_active = true;
$$;

create or replace function public.app_health_check()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    to_regclass('public.disciplinas') is not null
    and to_regclass('public.turmas') is not null
    and to_regclass('public.links') is not null;
$$;

revoke all on function public.get_public_scraper_status(text) from public;
revoke all on function public.count_public_subjects(text) from public;
revoke all on function public.count_public_classes(text) from public;
revoke all on function public.count_public_active_links(text) from public;
revoke all on function public.app_health_check() from public;

grant execute on function public.get_public_scraper_status(text) to anon, authenticated, service_role;
grant execute on function public.count_public_subjects(text) to anon, authenticated, service_role;
grant execute on function public.count_public_classes(text) to anon, authenticated, service_role;
grant execute on function public.count_public_active_links(text) to anon, authenticated, service_role;
grant execute on function public.app_health_check() to anon, authenticated, service_role;
