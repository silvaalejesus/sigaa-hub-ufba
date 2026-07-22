-- Testes transacionais das correções pós-Fase 2.
-- Execute somente em banco local/de desenvolvimento.

begin;

insert into public.disciplinas (id, codigo, nome, departamento)
values (
  '31000000-0000-0000-0000-000000000001',
  'TSTP3001',
  'Teste pós-Fase 2',
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
  '31000000-0000-0000-0000-000000000002',
  (select id from public.disciplinas where codigo = 'TSTP3001'),
  'T01',
  'Teste',
  '2099.2'
)
on conflict (disciplina_id, codigo_turma, semestre) do update
set professor = excluded.professor;

set local role anon;

do $test$
declare
  add_result text;
begin
  add_result := public.add_link_secure(
    '31000000-0000-0000-0000-000000000002',
    'https://chat.whatsapp.com/POSTPHASE2A',
    repeat('1', 64)
  );
  if add_result <> 'added' then
    raise exception 'Primeiro cadastro retornou %.', add_result;
  end if;

  add_result := public.add_link_secure(
    '31000000-0000-0000-0000-000000000002',
    'https://chat.whatsapp.com/POSTPHASE2B',
    repeat('2', 64)
  );
  if add_result <> 'active_link_exists' then
    raise exception 'Segundo link ativo retornou %.', add_result;
  end if;
end;
$test$;

reset role;

create temporary table post_phase2_target_link as
select id as link_id, url_whatsapp
from public.links
where turma_id = '31000000-0000-0000-0000-000000000002'
  and is_active is true;

grant select on table pg_temp.post_phase2_target_link to anon;

set local role anon;

do $test$
declare
  target_link uuid;
  result_one record;
  result_two record;
  result_three record;
  result_four record;
  add_result text;
begin
  select link_id into target_link from pg_temp.post_phase2_target_link limit 1;

  select * into result_one from public.report_link_secure(
    target_link,
    'Motivo válido para a primeira denúncia.',
    repeat('3', 64)
  );
  select * into result_two from public.report_link_secure(
    target_link,
    'Motivo válido para a segunda denúncia.',
    repeat('4', 64)
  );
  select * into result_three from public.report_link_secure(
    target_link,
    'Motivo válido para a terceira denúncia.',
    repeat('5', 64)
  );

  if result_one.result_status <> 'reported'
    or result_one.reports_count <> 1
    or result_one.is_active is not true
  then
    raise exception 'Primeira denúncia inválida: %.', row_to_json(result_one);
  end if;

  if result_two.result_status <> 'reported'
    or result_two.reports_count <> 2
    or result_two.is_active is not true
  then
    raise exception 'Segunda denúncia inválida: %.', row_to_json(result_two);
  end if;

  if result_three.result_status <> 'deactivated'
    or result_three.reports_count <> 3
    or result_three.is_active is not false
  then
    raise exception 'Terceira denúncia inválida: %.', row_to_json(result_three);
  end if;

  select * into result_four from public.report_link_secure(
    target_link,
    'Uma quarta denúncia não deve incrementar.',
    repeat('6', 64)
  );
  if result_four.result_status <> 'inactive'
    or result_four.reports_count <> 3
    or result_four.is_active is not false
  then
    raise exception 'Link inativo aceitou quarta denúncia: %.', row_to_json(result_four);
  end if;

  add_result := public.add_link_secure(
    '31000000-0000-0000-0000-000000000002',
    'https://chat.whatsapp.com/POSTPHASE2A',
    repeat('7', 64)
  );
  if add_result <> 'url_already_registered' then
    raise exception 'URL histórica retornou %.', add_result;
  end if;

  add_result := public.add_link_secure(
    '31000000-0000-0000-0000-000000000002',
    'https://chat.whatsapp.com/POSTPHASE2C',
    repeat('8', 64)
  );
  if add_result <> 'added' then
    raise exception 'Novo convite após desativação retornou %.', add_result;
  end if;
end;
$test$;

-- A policy pública mostra somente o novo link ativo.
do $test$
declare
  visible_count integer;
begin
  select count(*)::integer
  into visible_count
  from public.links
  where turma_id = '31000000-0000-0000-0000-000000000002';

  if visible_count <> 1 then
    raise exception 'Anon visualizou % links; esperado 1 ativo.', visible_count;
  end if;
end;
$test$;

-- Escritas diretas continuam proibidas.
do $test$
begin
  begin
    insert into public.links (turma_id, url_whatsapp)
    values (
      '31000000-0000-0000-0000-000000000002',
      'https://chat.whatsapp.com/DIRECTWRITE'
    );
    raise exception 'Anon inseriu diretamente em links.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.links set reports = 99;
    raise exception 'Anon atualizou links diretamente.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform id from public.link_reports limit 1;
    raise exception 'Anon leu link_reports.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

reset role;

-- O registro denunciado foi preservado e corretamente identificado.
do $test$
declare
  target_link uuid;
  stored_link record;
  report_rows integer;
begin
  select link_id into target_link from pg_temp.post_phase2_target_link limit 1;
  select * into stored_link from public.links where id = target_link;

  if stored_link.id is null
    or stored_link.reports <> 3
    or stored_link.is_active is not false
    or stored_link.inactive_reason <> 'reports_threshold'
  then
    raise exception 'Estado persistido inválido: %.', row_to_json(stored_link);
  end if;

  select count(*)::integer
  into report_rows
  from public.link_reports
  where link_id = target_link;

  if report_rows <> 3 then
    raise exception 'Foram preservadas % denúncias; esperado 3.', report_rows;
  end if;
end;
$test$;

-- Confirma as barreiras de concorrência no corpo das RPCs.
do $test$
declare
  add_definition text;
  report_definition text;
begin
  add_definition := pg_get_functiondef(
    'public.add_link_secure(uuid,text,text)'::regprocedure
  );
  report_definition := pg_get_functiondef(
    'public.report_link_secure(uuid,text,text)'::regprocedure
  );

  if add_definition not ilike '%pg_advisory_xact_lock%'
    or add_definition not ilike '%add_link_turma:%'
  then
    raise exception 'Cadastro perdeu advisory lock por turma.';
  end if;

  if report_definition not ilike '%for update%'
    or report_definition not ilike '%pg_advisory_xact_lock%'
  then
    raise exception 'Denúncia perdeu serialização transacional.';
  end if;
end;
$test$;

rollback;
