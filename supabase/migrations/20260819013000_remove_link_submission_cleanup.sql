-- SIGAA Hub UFBA
-- Ajuste incremental após 20260818234000_link_submitter_identity.sql:
-- 1) mantém a identificação privada de quem envia links;
-- 2) remove apenas a retenção/limpeza automática adicionada para link_submissions;
-- 3) preserva a limpeza preexistente de abuse_events.

begin;

create or replace function public.add_link_secure(
  p_turma_id uuid,
  p_url_whatsapp text,
  p_reporter_fingerprint text,
  p_submitter_name text,
  p_submitter_registration text,
  p_submitter_email text
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_url text;
  v_fingerprint text;
  v_name text;
  v_registration text;
  v_email text;
  v_attempts_last_hour integer;
  v_successes_last_day integer;
  v_constraint_name text;
  v_link_id uuid;
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

  v_name := btrim(coalesce(p_submitter_name, ''));
  if char_length(v_name) < 3 or char_length(v_name) > 100 then
    raise exception 'Invalid submitter name.' using errcode = '22023';
  end if;

  v_registration := btrim(coalesce(p_submitter_registration, ''));
  if v_registration !~ '^[0-9]{5,20}$' then
    raise exception 'Invalid submitter registration.' using errcode = '22023';
  end if;

  v_email := lower(btrim(coalesce(p_submitter_email, '')));
  if char_length(v_email) > 254
     or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid submitter email.' using errcode = '22023';
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
    )
    returning id into v_link_id;
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

  insert into private.link_submissions (
    link_id,
    submitter_name,
    submitter_registration,
    submitter_email
  ) values (
    v_link_id,
    v_name,
    v_registration,
    v_email
  );

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

  -- Mantém somente a limpeza antiabuso que já existia antes do patch
  -- de identificação privada. Não há cleanup de link_submissions.
  if pg_catalog.random() < 0.02 then
    perform public.cleanup_expired_abuse_events(interval '30 days', 250);
  end if;

  return 'added';
end;
$function$;

comment on function public.add_link_secure(
  uuid, text, text, text, text, text
) is
  'Cria convite com identificação administrativa privada do responsável pela submissão.';

revoke all on function public.add_link_secure(
  uuid, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.add_link_secure(
  uuid, text, text, text, text, text
) to anon, authenticated, service_role;

-- Remove exclusivamente a infraestrutura de retenção/limpeza criada
-- por 20260818234000_link_submitter_identity.sql.
drop function if exists private.cleanup_expired_link_submissions(integer);

drop index if exists private.link_submissions_retention_idx;

alter table if exists private.link_submissions
  drop constraint if exists link_submissions_retention_after_created;

alter table if exists private.link_submissions
  drop column if exists retention_until;

commit;
