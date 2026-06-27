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