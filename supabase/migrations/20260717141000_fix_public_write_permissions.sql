-- Corrige grants e policies legados que ainda permitiam escrita direta
-- pelas roles públicas após a migration principal da Fase 2.

begin;

alter table public.disciplinas enable row level security;
alter table public.turmas enable row level security;
alter table public.links enable row level security;

-- Remove policies legadas, inclusive policies FOR ALL que poderiam continuar
-- autorizando INSERT/UPDATE/DELETE diretamente nas tabelas públicas.
do $migration$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('disciplinas', 'turmas', 'links')
  loop
    execute pg_catalog.format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end;
$migration$;

-- Recria somente as policies de leitura pública necessárias.
create policy disciplinas_public_read
on public.disciplinas
for select
to anon, authenticated
using (true);

create policy turmas_public_read
on public.turmas
for select
to anon, authenticated
using (true);

create policy links_public_read_active
on public.links
for select
to anon, authenticated
using (is_active is true);

-- Remove privilégios de tabela e devolve apenas SELECT às roles públicas.
revoke all privileges on table public.disciplinas from public, anon, authenticated;
revoke all privileges on table public.turmas from public, anon, authenticated;
revoke all privileges on table public.links from public, anon, authenticated;

grant select on table public.disciplinas to anon, authenticated;
grant select on table public.turmas to anon, authenticated;
grant select on table public.links to anon, authenticated;

-- REVOKE em nível de tabela não elimina necessariamente grants antigos em
-- nível de coluna. Remove qualquer INSERT/UPDATE/REFERENCES legado.
do $migration$
declare
  privilege_record record;
  grantee_sql text;
begin
  for privilege_record in
    select distinct
      table_name,
      grantee,
      privilege_type,
      column_name
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name in ('disciplinas', 'turmas', 'links')
      and grantee in ('PUBLIC', 'anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE', 'REFERENCES')
  loop
    grantee_sql := case
      when privilege_record.grantee = 'PUBLIC' then 'PUBLIC'
      else pg_catalog.quote_ident(privilege_record.grantee)
    end;

    execute pg_catalog.format(
      'revoke %s (%I) on table public.%I from %s',
      privilege_record.privilege_type,
      privilege_record.column_name,
      privilege_record.table_name,
      grantee_sql
    );
  end loop;
end;
$migration$;

-- Preserva o acesso privilegiado usado pelo scraper e por operações internas.
grant select, insert, update, delete on table public.disciplinas to service_role;
grant select, insert, update, delete on table public.turmas to service_role;
grant select, insert, update, delete on table public.links to service_role;

commit;
