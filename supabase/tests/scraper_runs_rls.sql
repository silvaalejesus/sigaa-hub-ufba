-- Teste transacional das permissões da tabela scraper_runs.
-- Execute em um banco Supabase de desenvolvimento após aplicar a migration.

begin;

set local role anon;

do $$
begin
  begin
    perform id from public.scraper_runs limit 1;
    raise exception 'Falha: anon conseguiu ler public.scraper_runs';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.scraper_runs (status, trigger_source)
    values ('running', 'manual');
    raise exception 'Falha: anon conseguiu inserir em public.scraper_runs';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

do $$
declare
  public_status record;
begin
  select * into public_status
  from public.get_public_scraper_status(null)
  limit 1;

  if public_status is null then
    raise exception 'Falha: RPC pública não retornou o resumo esperado';
  end if;
end;
$$;

reset role;
set local role service_role;

do $$
declare
  inserted_id uuid;
begin
  insert into public.scraper_runs (status, trigger_source, semester)
  values ('running', 'local', '2026.2')
  returning id into inserted_id;

  update public.scraper_runs
  set status = 'success', finished_at = now()
  where id = inserted_id;

  delete from public.scraper_runs where id = inserted_id;
end;
$$;

reset role;

do $$
declare
  result_definition text;
begin
  select pg_get_function_result(
    'public.get_public_scraper_status(text)'::regprocedure
  ) into result_definition;

  if result_definition ilike '%error_message%'
    or result_definition ilike '%metadata%'
    or result_definition ilike '%trigger_source%'
  then
    raise exception 'Falha: RPC pública expõe coluna operacional restrita';
  end if;
end;
$$;

rollback;
