-- Testes transacionais da Fase 2.
-- Execute apenas em um banco Supabase de desenvolvimento após aplicar a migration.

begin;

insert into public.disciplinas (id, codigo, nome, departamento)
values (
  '20000000-0000-0000-0000-000000000001',
  'TSTP2001',
  'Teste de Segurança Fase 2',
  'TESTES'
)
on conflict (codigo) do update set nome = excluded.nome;

insert into public.turmas (
  id,
  disciplina_id,
  codigo_turma,
  professor,
  semestre
)
values (
  '20000000-0000-0000-0000-000000000002',
  (select id from public.disciplinas where codigo = 'TSTP2001'),
  'T01',
  'Teste',
  '2099.1'
)
on conflict (disciplina_id, codigo_turma, semestre) do update
set professor = excluded.professor;

set local role anon;

-- Leitura pública permitida.
do $$
begin
  if not exists (
    select 1 from public.turmas
    where id = '20000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Falha: anon não conseguiu ler turma pública.';
  end if;
end;
$$;

-- Escrita direta proibida.
do $$
begin
  begin
    insert into public.links (turma_id, url_whatsapp)
    values (
      '20000000-0000-0000-0000-000000000002',
      'https://chat.whatsapp.com/TESTEDIRETO'
    );
    raise exception 'Falha: anon inseriu diretamente em links.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

do $$
begin
  begin
    update public.links set reports = 99;
    raise exception 'Falha: anon atualizou links diretamente.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- Tabelas internas não expostas.
do $$
begin
  begin
    perform id from public.link_reports limit 1;
    raise exception 'Falha: anon leu link_reports.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform id from public.abuse_events limit 1;
    raise exception 'Falha: anon leu abuse_events.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- Função interna de limpeza não é pública.
do $$
begin
  begin
    perform public.cleanup_expired_abuse_events();
    raise exception 'Falha: anon executou função interna.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- Cadastro controlado funciona e a unicidade ativa é funcional.
do $$
declare
  first_result text;
  second_result text;
begin
  first_result := public.add_link_secure(
    '20000000-0000-0000-0000-000000000002',
    'https://chat.whatsapp.com/TESTEFASE2A',
    repeat('a', 64)
  );

  if first_result <> 'added' then
    raise exception 'Falha: primeiro cadastro retornou %.', first_result;
  end if;

  second_result := public.add_link_secure(
    '20000000-0000-0000-0000-000000000002',
    'https://chat.whatsapp.com/TESTEFASE2B',
    repeat('b', 64)
  );

  if second_result <> 'active_link_exists' then
    raise exception 'Falha: segundo cadastro retornou %.', second_result;
  end if;
end;
$$;

reset role;

-- Confirma que existe somente um ativo.
do $$
declare
  active_count integer;
begin
  select count(*)::integer
  into active_count
  from public.links
  where turma_id = '20000000-0000-0000-0000-000000000002'
    and is_active is true;

  if active_count <> 1 then
    raise exception 'Falha: encontrados % links ativos.', active_count;
  end if;
end;
$$;

create temporary table phase2_target_link as
select id as link_id
from public.links
where turma_id = '20000000-0000-0000-0000-000000000002'
  and is_active is true;

grant select on table pg_temp.phase2_target_link to anon;

set local role anon;

-- Três denúncias distintas desativam atomicamente.
do $$
declare
  target_link uuid;
  result_one text;
  result_two text;
  result_three text;
begin
  select link_id into target_link from pg_temp.phase2_target_link limit 1;

  result_one := public.report_link_secure(
    target_link,
    'Motivo válido para o primeiro teste.',
    repeat('c', 64)
  );
  result_two := public.report_link_secure(
    target_link,
    'Motivo válido para o segundo teste.',
    repeat('d', 64)
  );
  result_three := public.report_link_secure(
    target_link,
    'Motivo válido para o terceiro teste.',
    repeat('e', 64)
  );

  if result_one <> 'reported' or result_two <> 'reported' then
    raise exception 'Falha nas primeiras denúncias: %, %.', result_one, result_two;
  end if;

  if result_three <> 'deactivated' then
    raise exception 'Falha: terceira denúncia retornou %.', result_three;
  end if;

  if public.report_link_secure(
    target_link,
    'Tentativa contra link já inativo.',
    repeat('f', 64)
  ) <> 'inactive' then
    raise exception 'Falha: link inativo aceitou nova denúncia.';
  end if;
end;
$$;

-- Rate limit: a sexta tentativa de cadastro na hora é bloqueada.
do $$
declare
  current_result text;
  attempt integer;
begin
  for attempt in 1..6 loop
    current_result := public.add_link_secure(
      '29999999-9999-9999-9999-999999999999',
      'https://chat.whatsapp.com/RATELIMITTESTE',
      repeat('1', 64)
    );
  end loop;

  if current_result <> 'rate_limited' then
    raise exception 'Falha: sexta tentativa retornou %.', current_result;
  end if;
end;
$$;

reset role;
set local role service_role;

-- Service role preservada e limpeza operacional executável.
do $$
declare
  removed integer;
begin
  insert into public.abuse_events (
    action_scope,
    reporter_fingerprint,
    outcome,
    created_at
  ) values (
    'add_link_attempt',
    repeat('9', 64),
    'attempted',
    now() - interval '31 days'
  );

  removed := public.cleanup_expired_abuse_events(interval '30 days', 500);
  if removed < 1 then
    raise exception 'Falha: limpeza não removeu evento expirado.';
  end if;
end;
$$;

rollback;
