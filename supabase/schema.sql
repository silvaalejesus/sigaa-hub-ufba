-- ============================================================
-- SIGAA Hub - Fase 1: Infraestrutura de Banco de Dados
-- Supabase / PostgreSQL
-- ============================================================

-- Extensão para UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- LIMPEZA OPCIONAL
-- Use apenas em ambiente de desenvolvimento.
-- Em produção, remova este bloco.
-- ============================================================

-- drop table if exists public.links cascade;
-- drop table if exists public.turmas cascade;
-- drop table if exists public.disciplinas cascade;

-- ============================================================
-- TABELA: disciplinas
-- ============================================================

create table if not exists public.disciplinas (
    id uuid primary key default gen_random_uuid(),

    codigo text not null,
    nome text not null,
    departamento text,

    created_at timestamptz not null default now(),

    constraint disciplinas_codigo_unique unique (codigo),

    constraint disciplinas_codigo_not_empty
        check (length(trim(codigo)) > 0),

    constraint disciplinas_nome_not_empty
        check (length(trim(nome)) > 0)
);

comment on table public.disciplinas is
'Disciplinas ofertadas pela universidade.';

comment on column public.disciplinas.codigo is
'Código da disciplina, exemplo: MATA56.';

comment on column public.disciplinas.nome is
'Nome da disciplina, exemplo: Paradigmas de Programação.';

comment on column public.disciplinas.departamento is
'Departamento ou unidade acadêmica responsável pela disciplina.';

-- ============================================================
-- TABELA: turmas
-- ============================================================

create table if not exists public.turmas (
    id uuid primary key default gen_random_uuid(),

    disciplina_id uuid not null,
    codigo_turma text not null,
    professor text,
    semestre text not null,

    created_at timestamptz not null default now(),

    constraint turmas_disciplina_fk
        foreign key (disciplina_id)
        references public.disciplinas (id)
        on delete cascade,

    constraint turmas_unique_disciplina_turma_semestre
        unique (disciplina_id, codigo_turma, semestre),

    constraint turmas_codigo_turma_not_empty
        check (length(trim(codigo_turma)) > 0),

    constraint turmas_semestre_not_empty
        check (length(trim(semestre)) > 0)
);

comment on table public.turmas is
'Turmas ofertadas para cada disciplina em determinado semestre.';

comment on column public.turmas.codigo_turma is
'Código da turma, exemplo: T01.';

comment on column public.turmas.semestre is
'Semestre de oferta, exemplo: 2026.1.';

create index if not exists idx_turmas_disciplina_id
on public.turmas (disciplina_id);

create index if not exists idx_turmas_semestre
on public.turmas (semestre);

-- ============================================================
-- TABELA: links
-- ============================================================

create table if not exists public.links (
    id uuid primary key default gen_random_uuid(),

    turma_id uuid not null,
    url_whatsapp text not null,

    reports integer not null default 0,
    is_active boolean not null default true,

    created_at timestamptz not null default now(),

    constraint links_turma_fk
        foreign key (turma_id)
        references public.turmas (id)
        on delete cascade,

    -- Validação específica para links públicos de grupo do WhatsApp.
    -- Exemplo aceito:
    -- https://chat.whatsapp.com/ABCDEFG123456789
    constraint links_url_whatsapp_check
        check (
            url_whatsapp ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9_-]+/?$'
        ),

    constraint links_reports_non_negative
        check (reports >= 0)
);

comment on table public.links is
'Links de grupos de WhatsApp associados às turmas.';

comment on column public.links.url_whatsapp is
'URL pública do grupo de WhatsApp.';

comment on column public.links.reports is
'Quantidade de denúncias recebidas pelo link.';

comment on column public.links.is_active is
'Define se o link está ativo e deve aparecer no sistema.';

create index if not exists idx_links_turma_id
on public.links (turma_id);

create index if not exists idx_links_is_active
on public.links (is_active);

-- Evita múltiplos links idênticos para a mesma turma.
create unique index if not exists idx_links_unique_turma_url
on public.links (turma_id, url_whatsapp);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.disciplinas enable row level security;
alter table public.turmas enable row level security;
alter table public.links enable row level security;

-- ============================================================
-- POLÍTICAS DE LEITURA PÚBLICA
-- ============================================================

drop policy if exists "Leitura publica de disciplinas"
on public.disciplinas;

create policy "Leitura publica de disciplinas"
on public.disciplinas
for select
to anon, authenticated
using (true);


drop policy if exists "Leitura publica de turmas"
on public.turmas;

create policy "Leitura publica de turmas"
on public.turmas
for select
to anon, authenticated
using (true);


drop policy if exists "Leitura publica de links ativos"
on public.links;

create policy "Leitura publica de links ativos"
on public.links
for select
to anon, authenticated
using (
    is_active = true
);

-- ============================================================
-- POLÍTICA DE INSERÇÃO PÚBLICA EM links
-- ============================================================
-- A inserção pública é permitida apenas na tabela links.
-- O usuário anônimo poderá informar:
-- - turma_id
-- - url_whatsapp
--
-- Os campos id, reports, is_active e created_at usam valores default.
-- Isso reduz a superfície de abuso no client.

drop policy if exists "Insercao publica de links"
on public.links;

create policy "Insercao publica de links"
on public.links
for insert
to anon, authenticated
with check (
    is_active = true
    and reports = 0
    and url_whatsapp ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9_-]+/?$'
);

-- ============================================================
-- PRIVILÉGIOS
-- ============================================================
-- RLS define quais linhas podem ser acessadas.
-- GRANT define quais operações e colunas podem ser usadas.
--
-- Proteção contra SQL Injection não depende apenas de RLS.
-- Ela vem da combinação de:
-- - uso do Supabase Client, sem SQL bruto no front-end;
-- - constraints no banco;
-- - permissões mínimas;
-- - RLS;
-- - validação no front-end e no banco.

revoke all on table public.disciplinas from anon, authenticated;
revoke all on table public.turmas from anon, authenticated;
revoke all on table public.links from anon, authenticated;

-- Leitura pública
grant select
on table public.disciplinas
to anon, authenticated;

grant select
on table public.turmas
to anon, authenticated;

grant select
on table public.links
to anon, authenticated;

-- Inserção pública restrita apenas às colunas necessárias
grant insert (turma_id, url_whatsapp)
on table public.links
to anon, authenticated;

-- Nenhum UPDATE ou DELETE público por padrão.
-- Isso impede que usuários anônimos alterem ou apaguem disciplinas, turmas ou links.

-- ============================================================
-- FIM
-- ============================================================

-- post-phase2-functional-fixes-2026-07-21
-- Mantido em sincronia com a migration corretiva abaixo.
-- SIGAA Hub UFBA — correções funcionais pós-Fase 2.
-- Preserva links e denúncias existentes; não inicia a Fase 3.


-- Corrige deterministicamente qualquer duplicidade ativa antes de reafirmar
-- o índice parcial. Nenhuma linha é excluída.
with ranked_active_links as (
  select
    id,
    row_number() over (
      partition by turma_id
      order by created_at desc, id desc
    ) as active_rank
  from public.links
  where is_active is true
)
update public.links as links
set
  is_active = false,
  inactive_reason = coalesce(links.inactive_reason, 'deduplicated_active_link')
from ranked_active_links
where links.id = ranked_active_links.id
  and ranked_active_links.active_rank > 1;

create unique index if not exists one_active_link_per_class
  on public.links (turma_id)
  where is_active is true;

-- Mantém a regra histórica que impede reutilizar o mesmo convite exato para
-- a mesma turma. Se o índice ainda não existir, a migration o cria.
create unique index if not exists idx_links_unique_turma_url
  on public.links (turma_id, url_whatsapp);

-- O novo resultado funcional precisa ser aceito na trilha antiabuso.
alter table public.abuse_events
  drop constraint if exists abuse_events_outcome_check;

alter table public.abuse_events
  add constraint abuse_events_outcome_check
  check (
    outcome in (
      'attempted',
      'accepted',
      'rate_limited',
      'duplicate',
      'inactive',
      'not_found',
      'active_link_exists',
      'url_already_registered'
    )
  );

-- Cadastro seguro: serializa por origem e também por turma, diferencia link
-- ativo de URL histórica repetida e mantém o índice como última barreira.
create or replace function public.add_link_secure(
  p_turma_id uuid,
  p_url_whatsapp text,
  p_reporter_fingerprint text
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_url text;
  v_fingerprint text;
  v_attempts_last_hour integer;
  v_successes_last_day integer;
  v_constraint_name text;
begin
  if p_turma_id is null then
    return 'not_found';
  end if;

  v_url := btrim(coalesce(p_url_whatsapp, ''));
  if v_url !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9_-]+/?$' then
    raise exception 'Invalid WhatsApp invite URL.' using errcode = '22023';
  end if;

  v_fingerprint := lower(btrim(coalesce(p_reporter_fingerprint, '')));
  if v_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid reporter fingerprint.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('add_link:' || v_fingerprint, 0)
  );

  insert into public.abuse_events (
    action_scope,
    reporter_fingerprint,
    resource_id,
    outcome
  ) values (
    'add_link_attempt',
    v_fingerprint,
    p_turma_id,
    'attempted'
  );

  select count(*)::integer
  into v_attempts_last_hour
  from public.abuse_events
  where action_scope = 'add_link_attempt'
    and reporter_fingerprint = v_fingerprint
    and created_at >= now() - interval '1 hour';

  if v_attempts_last_hour > 5 then
    update public.abuse_events
    set outcome = 'rate_limited'
    where id = (
      select id
      from public.abuse_events
      where action_scope = 'add_link_attempt'
        and reporter_fingerprint = v_fingerprint
      order by id desc
      limit 1
    );
    return 'rate_limited';
  end if;

  select count(*)::integer
  into v_successes_last_day
  from public.abuse_events
  where action_scope = 'add_link_success'
    and reporter_fingerprint = v_fingerprint
    and created_at >= now() - interval '24 hours';

  if v_successes_last_day >= 2 then
    update public.abuse_events
    set outcome = 'rate_limited'
    where id = (
      select id
      from public.abuse_events
      where action_scope = 'add_link_attempt'
        and reporter_fingerprint = v_fingerprint
      order by id desc
      limit 1
    );
    return 'rate_limited';
  end if;

  if not exists (select 1 from public.turmas where id = p_turma_id) then
    update public.abuse_events
    set outcome = 'not_found'
    where id = (
      select id
      from public.abuse_events
      where action_scope = 'add_link_attempt'
        and reporter_fingerprint = v_fingerprint
      order by id desc
      limit 1
    );
    return 'not_found';
  end if;

  -- Diferentes origens que cadastram na mesma turma são serializadas aqui.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('add_link_turma:' || p_turma_id::text, 0)
  );

  if exists (
    select 1
    from public.links
    where turma_id = p_turma_id
      and is_active is true
  ) then
    update public.abuse_events
    set outcome = 'active_link_exists'
    where id = (
      select id
      from public.abuse_events
      where action_scope = 'add_link_attempt'
        and reporter_fingerprint = v_fingerprint
      order by id desc
      limit 1
    );
    return 'active_link_exists';
  end if;

  if exists (
    select 1
    from public.links
    where turma_id = p_turma_id
      and url_whatsapp = v_url
  ) then
    update public.abuse_events
    set outcome = 'url_already_registered'
    where id = (
      select id
      from public.abuse_events
      where action_scope = 'add_link_attempt'
        and reporter_fingerprint = v_fingerprint
      order by id desc
      limit 1
    );
    return 'url_already_registered';
  end if;

  begin
    insert into public.links (
      turma_id,
      url_whatsapp,
      reports,
      is_active,
      inactive_reason
    ) values (
      p_turma_id,
      v_url,
      0,
      true,
      null
    );
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;

      if v_constraint_name = 'one_active_link_per_class' then
        update public.abuse_events
        set outcome = 'active_link_exists'
        where id = (
          select id
          from public.abuse_events
          where action_scope = 'add_link_attempt'
            and reporter_fingerprint = v_fingerprint
          order by id desc
          limit 1
        );
        return 'active_link_exists';
      end if;

      if v_constraint_name in (
        'idx_links_unique_turma_url',
        'links_turma_id_url_whatsapp_key'
      ) then
        update public.abuse_events
        set outcome = 'url_already_registered'
        where id = (
          select id
          from public.abuse_events
          where action_scope = 'add_link_attempt'
            and reporter_fingerprint = v_fingerprint
          order by id desc
          limit 1
        );
        return 'url_already_registered';
      end if;

      raise;
  end;

  insert into public.abuse_events (
    action_scope,
    reporter_fingerprint,
    resource_id,
    outcome
  ) values (
    'add_link_success',
    v_fingerprint,
    p_turma_id,
    'accepted'
  );

  if pg_catalog.random() < 0.02 then
    perform public.cleanup_expired_abuse_events(interval '30 days', 250);
  end if;

  return 'added';
end;
$function$;

comment on function public.add_link_secure(uuid, text, text) is
  'Cria um novo convite somente quando a turma não possui link ativo e diferencia URL histórica repetida.';

-- A alteração do tipo de retorno exige recriar a função.
revoke all on function public.report_link_secure(uuid, text, text)
  from public, anon, authenticated;
drop function public.report_link_secure(uuid, text, text);

create function public.report_link_secure(
  p_link_id uuid,
  p_motivo text,
  p_reporter_fingerprint text
)
returns table (
  result_status text,
  reports_count integer,
  is_active boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_motivo text;
  v_fingerprint text;
  v_attempts_last_hour integer;
  v_link public.links%rowtype;
  v_new_reports integer;
begin
  if p_link_id is null then
    return query select 'not_found'::text, null::integer, null::boolean;
    return;
  end if;

  v_motivo := btrim(coalesce(p_motivo, ''));
  if char_length(v_motivo) < 10 or char_length(v_motivo) > 150 then
    raise exception 'Invalid report reason.' using errcode = '22023';
  end if;

  v_fingerprint := lower(btrim(coalesce(p_reporter_fingerprint, '')));
  if v_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid reporter fingerprint.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('report_link:' || v_fingerprint, 0)
  );

  insert into public.abuse_events (
    action_scope,
    reporter_fingerprint,
    resource_id,
    outcome
  ) values (
    'report_link_attempt',
    v_fingerprint,
    p_link_id,
    'attempted'
  );

  select count(*)::integer
  into v_attempts_last_hour
  from public.abuse_events
  where action_scope = 'report_link_attempt'
    and reporter_fingerprint = v_fingerprint
    and created_at >= now() - interval '1 hour';

  if v_attempts_last_hour > 10 then
    update public.abuse_events
    set outcome = 'rate_limited'
    where id = (
      select id
      from public.abuse_events
      where action_scope = 'report_link_attempt'
        and reporter_fingerprint = v_fingerprint
      order by id desc
      limit 1
    );
    return query select 'rate_limited'::text, null::integer, null::boolean;
    return;
  end if;

  if exists (
    select 1
    from public.link_reports
    where link_id = p_link_id
      and reporter_fingerprint = v_fingerprint
      and created_at >= now() - interval '24 hours'
  ) then
    update public.abuse_events
    set outcome = 'duplicate'
    where id = (
      select id
      from public.abuse_events
      where action_scope = 'report_link_attempt'
        and reporter_fingerprint = v_fingerprint
      order by id desc
      limit 1
    );

    select *
    into v_link
    from public.links
    where id = p_link_id;

    if not found then
      return query select 'not_found'::text, null::integer, null::boolean;
      return;
    end if;

    return query select
      'duplicate'::text,
      least(coalesce(v_link.reports, 0), 3),
      v_link.is_active;
    return;
  end if;

  select *
  into v_link
  from public.links
  where id = p_link_id
  for update;

  if not found then
    update public.abuse_events
    set outcome = 'not_found'
    where id = (
      select id
      from public.abuse_events
      where action_scope = 'report_link_attempt'
        and reporter_fingerprint = v_fingerprint
      order by id desc
      limit 1
    );
    return query select 'not_found'::text, null::integer, null::boolean;
    return;
  end if;

  if v_link.is_active is not true then
    update public.abuse_events
    set outcome = 'inactive'
    where id = (
      select id
      from public.abuse_events
      where action_scope = 'report_link_attempt'
        and reporter_fingerprint = v_fingerprint
      order by id desc
      limit 1
    );
    return query select
      'inactive'::text,
      least(coalesce(v_link.reports, 0), 3),
      false;
    return;
  end if;

  insert into public.link_reports (
    link_id,
    motivo,
    reporter_fingerprint,
    country_code
  ) values (
    p_link_id,
    v_motivo,
    v_fingerprint,
    null
  );

  v_new_reports := least(coalesce(v_link.reports, 0) + 1, 3);

  update public.links
  set
    reports = v_new_reports,
    is_active = v_new_reports < 3,
    inactive_reason = case
      when v_new_reports >= 3 then 'reports_threshold'
      else inactive_reason
    end
  where id = p_link_id;

  insert into public.abuse_events (
    action_scope,
    reporter_fingerprint,
    resource_id,
    outcome
  ) values (
    'report_link_success',
    v_fingerprint,
    p_link_id,
    'accepted'
  );

  if pg_catalog.random() < 0.02 then
    perform public.cleanup_expired_abuse_events(interval '30 days', 250);
  end if;

  if v_new_reports >= 3 then
    return query select 'deactivated'::text, 3, false;
    return;
  end if;

  return query select 'reported'::text, v_new_reports, true;
end;
$function$;

comment on function public.report_link_secure(uuid, text, text) is
  'Registra denúncia atomicamente e retorna status, contagem real e estado final do link.';

-- Reafirma RLS: somente links ativos são visíveis publicamente.
alter table public.links enable row level security;

do $migration$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'links'
  loop
    execute pg_catalog.format(
      'drop policy if exists %I on public.links',
      policy_record.policyname
    );
  end loop;
end;
$migration$;

create policy links_public_read_active
on public.links
for select
to anon, authenticated
using (is_active is true);

revoke all privileges on table public.links from public, anon, authenticated;
grant select on table public.links to anon, authenticated;
grant select, insert, update, delete on table public.links to service_role;

revoke all on function public.add_link_secure(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.report_link_secure(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.add_link_secure(uuid, text, text)
  to anon, authenticated, service_role;
grant execute on function public.report_link_secure(uuid, text, text)
  to anon, authenticated, service_role;

-- RPC legada não volta a ser superfície pública.
drop function if exists public.incrementar_reports_link(uuid);
drop function if exists public.incrementar_reports_link(uuid, text, text, text);
