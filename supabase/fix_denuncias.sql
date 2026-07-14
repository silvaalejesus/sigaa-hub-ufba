-- SIGAA Hub - UFBA
-- Persistência das denúncias + incremento seguro do contador de reports.
--
-- Execute este arquivo no SQL Editor do Supabase com o usuário proprietário
-- das tabelas e funções do schema public.

begin;

-- Clientes públicos não devem atualizar links diretamente.
revoke update on table public.links from anon, authenticated;

create table if not exists public.link_reports (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links(id) on delete cascade,
  motivo text not null,
  reporter_fingerprint text,
  country_code text,
  created_at timestamptz not null default now(),

  constraint link_reports_motivo_length
    check (char_length(btrim(motivo)) between 10 and 150),

  constraint link_reports_fingerprint_format
    check (
      reporter_fingerprint is null
      or reporter_fingerprint ~ '^[0-9a-f]{64}$'
    ),

  constraint link_reports_country_code_format
    check (
      country_code is null
      or country_code ~ '^[A-Z]{2}$'
    )
);

comment on table public.link_reports is
  'Registra individualmente as denúncias realizadas contra links de grupos.';

comment on column public.link_reports.motivo is
  'Motivo informado pelo usuário, entre 10 e 150 caracteres.';

comment on column public.link_reports.reporter_fingerprint is
  'HMAC SHA-256 pseudonimizado, criado no servidor sem persistir o IP bruto.';

comment on column public.link_reports.country_code is
  'País aproximado associado ao IP pela infraestrutura da Vercel, em ISO 3166-1 alpha-2.';

comment on column public.link_reports.created_at is
  'Data e hora da denúncia geradas pelo PostgreSQL em timestamptz.';

create index if not exists link_reports_link_id_created_at_idx
  on public.link_reports (link_id, created_at desc);

-- Impede que a mesma origem pseudonimizada denuncie o mesmo link mais de uma vez.
-- Quando o fingerprint for nulo, por exemplo em desenvolvimento sem secret, o
-- índice não é aplicado.
create unique index if not exists link_reports_unique_reporter_per_link_idx
  on public.link_reports (link_id, reporter_fingerprint)
  where reporter_fingerprint is not null;

alter table public.link_reports enable row level security;

-- A tabela não é exposta para leitura ou escrita direta pelo cliente.
-- Todas as inserções passam exclusivamente pela RPC SECURITY DEFINER.
revoke all on table public.link_reports from anon, authenticated;
grant all on table public.link_reports to service_role;

-- Remove a assinatura antiga para evitar duas RPCs com o mesmo nome.
drop function if exists public.incrementar_reports_link(uuid);
drop function if exists public.incrementar_reports_link(uuid, text, text, text);

create function public.incrementar_reports_link(
  p_link_id uuid,
  p_motivo text,
  p_reporter_fingerprint text default null,
  p_country_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_motivo text;
  v_reporter_fingerprint text;
  v_country_code text;
begin
  if p_link_id is null then
    raise exception 'O identificador do link não pode ser nulo.'
      using errcode = '22004';
  end if;

  v_motivo := btrim(coalesce(p_motivo, ''));

  if char_length(v_motivo) < 10 or char_length(v_motivo) > 150 then
    raise exception 'O motivo deve possuir entre 10 e 150 caracteres.'
      using errcode = '22023';
  end if;

  v_reporter_fingerprint :=
    nullif(lower(btrim(coalesce(p_reporter_fingerprint, ''))), '');

  if v_reporter_fingerprint is not null
    and v_reporter_fingerprint !~ '^[0-9a-f]{64}$'
  then
    raise exception 'Fingerprint técnico inválido.'
      using errcode = '22023';
  end if;

  v_country_code :=
    nullif(upper(btrim(coalesce(p_country_code, ''))), '');

  -- Um header inesperado não deve impedir a denúncia.
  if v_country_code is not null
    and v_country_code !~ '^[A-Z]{2}$'
  then
    v_country_code := null;
  end if;

  -- Bloqueia a linha enquanto a denúncia é inserida e o contador atualizado.
  -- Isso evita condições de corrida em denúncias simultâneas.
  perform 1
  from public.links
  where id = p_link_id
    and is_active is true
  for update;

  if not found then
    raise exception 'Link não encontrado ou já está inativo.'
      using errcode = 'P0002';
  end if;

  begin
    insert into public.link_reports (
      link_id,
      motivo,
      reporter_fingerprint,
      country_code
    )
    values (
      p_link_id,
      v_motivo,
      v_reporter_fingerprint,
      v_country_code
    );
  exception
    when unique_violation then
      raise exception 'Esta origem já denunciou este link.'
        using errcode = 'P0001';
  end;

  update public.links
  set
    reports = coalesce(reports, 0) + 1,
    is_active = case
      when coalesce(reports, 0) + 1 >= 3 then false
      else true
    end
  where id = p_link_id;
end;
$function$;

comment on function public.incrementar_reports_link(uuid, text, text, text) is
  'Persiste uma denúncia, incrementa reports atomicamente e desativa o link ao atingir três denúncias.';

-- Funções recebem EXECUTE de PUBLIC por padrão no PostgreSQL.
revoke all on function public.incrementar_reports_link(uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.incrementar_reports_link(uuid, text, text, text)
  to anon, authenticated, service_role;

commit;
