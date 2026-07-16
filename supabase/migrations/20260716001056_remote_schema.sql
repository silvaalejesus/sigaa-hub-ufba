drop extension if exists "pg_net";

create extension if not exists "unaccent" with schema "public";


  create table "public"."disciplinas" (
    "id" uuid not null default gen_random_uuid(),
    "codigo" text not null,
    "nome" text not null,
    "departamento" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."disciplinas" enable row level security;


  create table "public"."link_reports" (
    "id" uuid not null default gen_random_uuid(),
    "link_id" uuid not null,
    "motivo" text not null,
    "reporter_fingerprint" text,
    "country_code" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."link_reports" enable row level security;


  create table "public"."links" (
    "id" uuid not null default gen_random_uuid(),
    "turma_id" uuid not null,
    "url_whatsapp" text not null,
    "reports" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."links" enable row level security;


  create table "public"."turmas" (
    "id" uuid not null default gen_random_uuid(),
    "disciplina_id" uuid not null,
    "codigo_turma" text not null,
    "professor" text,
    "semestre" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."turmas" enable row level security;

CREATE UNIQUE INDEX disciplinas_codigo_unique ON public.disciplinas USING btree (codigo);

CREATE UNIQUE INDEX disciplinas_pkey ON public.disciplinas USING btree (id);

CREATE INDEX idx_links_is_active ON public.links USING btree (is_active);

CREATE INDEX idx_links_turma_id ON public.links USING btree (turma_id);

CREATE UNIQUE INDEX idx_links_unique_turma_url ON public.links USING btree (turma_id, url_whatsapp);

CREATE INDEX idx_turmas_disciplina_id ON public.turmas USING btree (disciplina_id);

CREATE INDEX idx_turmas_semestre ON public.turmas USING btree (semestre);

CREATE INDEX link_reports_link_id_created_at_idx ON public.link_reports USING btree (link_id, created_at DESC);

CREATE UNIQUE INDEX link_reports_pkey ON public.link_reports USING btree (id);

CREATE UNIQUE INDEX link_reports_unique_reporter_per_link_idx ON public.link_reports USING btree (link_id, reporter_fingerprint) WHERE (reporter_fingerprint IS NOT NULL);

CREATE UNIQUE INDEX links_pkey ON public.links USING btree (id);

CREATE UNIQUE INDEX turmas_pkey ON public.turmas USING btree (id);

CREATE UNIQUE INDEX turmas_unique_disciplina_turma_semestre ON public.turmas USING btree (disciplina_id, codigo_turma, semestre);

alter table "public"."disciplinas" add constraint "disciplinas_pkey" PRIMARY KEY using index "disciplinas_pkey";

alter table "public"."link_reports" add constraint "link_reports_pkey" PRIMARY KEY using index "link_reports_pkey";

alter table "public"."links" add constraint "links_pkey" PRIMARY KEY using index "links_pkey";

alter table "public"."turmas" add constraint "turmas_pkey" PRIMARY KEY using index "turmas_pkey";

alter table "public"."disciplinas" add constraint "disciplinas_codigo_not_empty" CHECK ((length(TRIM(BOTH FROM codigo)) > 0)) not valid;

alter table "public"."disciplinas" validate constraint "disciplinas_codigo_not_empty";

alter table "public"."disciplinas" add constraint "disciplinas_codigo_unique" UNIQUE using index "disciplinas_codigo_unique";

alter table "public"."disciplinas" add constraint "disciplinas_nome_not_empty" CHECK ((length(TRIM(BOTH FROM nome)) > 0)) not valid;

alter table "public"."disciplinas" validate constraint "disciplinas_nome_not_empty";

alter table "public"."link_reports" add constraint "link_reports_country_code_format" CHECK (((country_code IS NULL) OR (country_code ~ '^[A-Z]{2}$'::text))) not valid;

alter table "public"."link_reports" validate constraint "link_reports_country_code_format";

alter table "public"."link_reports" add constraint "link_reports_fingerprint_format" CHECK (((reporter_fingerprint IS NULL) OR (reporter_fingerprint ~ '^[0-9a-f]{64}$'::text))) not valid;

alter table "public"."link_reports" validate constraint "link_reports_fingerprint_format";

alter table "public"."link_reports" add constraint "link_reports_link_id_fkey" FOREIGN KEY (link_id) REFERENCES public.links(id) ON DELETE CASCADE not valid;

alter table "public"."link_reports" validate constraint "link_reports_link_id_fkey";

alter table "public"."link_reports" add constraint "link_reports_motivo_length" CHECK (((char_length(btrim(motivo)) >= 10) AND (char_length(btrim(motivo)) <= 150))) not valid;

alter table "public"."link_reports" validate constraint "link_reports_motivo_length";

alter table "public"."links" add constraint "links_reports_non_negative" CHECK ((reports >= 0)) not valid;

alter table "public"."links" validate constraint "links_reports_non_negative";

alter table "public"."links" add constraint "links_turma_fk" FOREIGN KEY (turma_id) REFERENCES public.turmas(id) ON DELETE CASCADE not valid;

alter table "public"."links" validate constraint "links_turma_fk";

alter table "public"."links" add constraint "links_url_whatsapp_check" CHECK ((url_whatsapp ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9_-]+/?$'::text)) not valid;

alter table "public"."links" validate constraint "links_url_whatsapp_check";

alter table "public"."turmas" add constraint "turmas_codigo_turma_not_empty" CHECK ((length(TRIM(BOTH FROM codigo_turma)) > 0)) not valid;

alter table "public"."turmas" validate constraint "turmas_codigo_turma_not_empty";

alter table "public"."turmas" add constraint "turmas_disciplina_fk" FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id) ON DELETE CASCADE not valid;

alter table "public"."turmas" validate constraint "turmas_disciplina_fk";

alter table "public"."turmas" add constraint "turmas_semestre_not_empty" CHECK ((length(TRIM(BOTH FROM semestre)) > 0)) not valid;

alter table "public"."turmas" validate constraint "turmas_semestre_not_empty";

alter table "public"."turmas" add constraint "turmas_unique_disciplina_turma_semestre" UNIQUE using index "turmas_unique_disciplina_turma_semestre";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.incrementar_reports_link(p_link_id uuid, p_motivo text, p_reporter_fingerprint text DEFAULT NULL::text, p_country_code text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

grant select on table "public"."disciplinas" to "anon";

grant select on table "public"."disciplinas" to "authenticated";

grant delete on table "public"."disciplinas" to "service_role";

grant insert on table "public"."disciplinas" to "service_role";

grant references on table "public"."disciplinas" to "service_role";

grant select on table "public"."disciplinas" to "service_role";

grant trigger on table "public"."disciplinas" to "service_role";

grant truncate on table "public"."disciplinas" to "service_role";

grant update on table "public"."disciplinas" to "service_role";

grant delete on table "public"."link_reports" to "service_role";

grant insert on table "public"."link_reports" to "service_role";

grant references on table "public"."link_reports" to "service_role";

grant select on table "public"."link_reports" to "service_role";

grant trigger on table "public"."link_reports" to "service_role";

grant truncate on table "public"."link_reports" to "service_role";

grant update on table "public"."link_reports" to "service_role";

grant select on table "public"."links" to "anon";

grant select on table "public"."links" to "authenticated";

grant delete on table "public"."links" to "service_role";

grant insert on table "public"."links" to "service_role";

grant references on table "public"."links" to "service_role";

grant select on table "public"."links" to "service_role";

grant trigger on table "public"."links" to "service_role";

grant truncate on table "public"."links" to "service_role";

grant update on table "public"."links" to "service_role";

grant select on table "public"."turmas" to "anon";

grant select on table "public"."turmas" to "authenticated";

grant delete on table "public"."turmas" to "service_role";

grant insert on table "public"."turmas" to "service_role";

grant references on table "public"."turmas" to "service_role";

grant select on table "public"."turmas" to "service_role";

grant trigger on table "public"."turmas" to "service_role";

grant truncate on table "public"."turmas" to "service_role";

grant update on table "public"."turmas" to "service_role";


  create policy "Leitura publica de disciplinas"
  on "public"."disciplinas"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Insercao publica de links"
  on "public"."links"
  as permissive
  for insert
  to anon, authenticated
with check (((is_active = true) AND (reports = 0) AND (url_whatsapp ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9_-]+/?;
::text)));



  create policy "Leitura publica de links ativos"
  on "public"."links"
  as permissive
  for select
  to anon, authenticated
using ((is_active = true));



  create policy "Leitura publica de turmas"
  on "public"."turmas"
  as permissive
  for select
  to anon, authenticated
using (true);



