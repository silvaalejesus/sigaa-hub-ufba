import { createClient } from "@/lib/supabase/server";
import type { DisciplinaComTurmas } from "@/types/database";

const SEMESTRE_VIGENTE = "2026.1";
const MAX_RESULTADOS = 80;

export interface BuscarDisciplinasParams {
  query?: string;
  departamento?: string;
  apenasComGrupos?: boolean;
}

export async function buscarDisciplinas({
  query,
  departamento,
  apenasComGrupos = false,
}: BuscarDisciplinasParams = {}): Promise<DisciplinaComTurmas[]> {
  const supabase = await createClient();

  const trimmedQuery = query?.trim() ?? "";
  const trimmedDepartamento = departamento?.trim() ?? "";

  let request = supabase
    .from("disciplinas")
    .select(
      `
      id,
      codigo,
      nome,
      departamento,
      created_at,
      turmas!inner (
        id,
        codigo_turma,
        professor,
        semestre,
        disciplina_id,
        created_at,
        links (
          id,
          turma_id,
          url_whatsapp,
          reports,
          is_active,
          created_at
        )
      )
    `,
    )
    .eq("turmas.semestre", SEMESTRE_VIGENTE)
    .eq("turmas.links.is_active", true)
    .order("nome", { ascending: true })
    .limit(MAX_RESULTADOS);

  if (trimmedQuery.length > 0) {
    request = request.or(
      `nome.ilike.%${trimmedQuery}%,codigo.ilike.%${trimmedQuery}%`,
    );
  }

  if (trimmedDepartamento.length > 0) {
    request = request.eq("departamento", trimmedDepartamento);
  }

  const { data, error } = await request;

  if (error) {
    console.error("[SIGAA Hub] Erro ao buscar disciplinas:", error.message);
    return [];
  }

  const disciplinas = ((data ?? []) as DisciplinaComTurmas[]).map(
    (disciplina) => ({
      ...disciplina,
      turmas: disciplina.turmas.map((turma) => ({
        ...turma,
        links: turma.links.filter((link) => link.is_active === true),
      })),
    }),
  );

  if (apenasComGrupos) {
    return disciplinas.filter((disciplina) =>
      disciplina.turmas.some((turma) => turma.links.length > 0),
    );
  }

  return disciplinas;
}

export async function buscarDepartamentos(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("disciplinas")
    .select("departamento")
    .not("departamento", "is", null)
    .order("departamento", { ascending: true });

  if (error) {
    console.error("[SIGAA Hub] Erro ao buscar departamentos:", error.message);
    return [];
  }

  const departamentos = new Set<string>();

  for (const row of (data ?? []) as Array<{ departamento: string | null }>) {
    const departamento = row.departamento?.trim();

    if (departamento) {
      departamentos.add(departamento);
    }
  }

  return Array.from(departamentos);
}
