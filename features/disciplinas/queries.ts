import { createClient } from "@/lib/supabase/server";
import type { DisciplinaComTurmas } from "@/types/database";

const SEMESTRE_VIGENTE = "2026.1";
const MAX_RESULTADOS = 60;

interface BuscarDisciplinasParams {
  query?: string;
  departamento?: string;
}

/**
 * Busca disciplinas com suas turmas e links ativos do semestre vigente.
 *
 * Observações:
 * - `turmas!inner` garante que só venham disciplinas com turmas no semestre.
 * - O filtro de `links.is_active` afeta apenas os links embutidos.
 *   Assim, turmas sem link continuam aparecendo para permitir "Adicionar Link".
 */
export async function buscarDisciplinas({
  query,
  departamento,
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

  return (data ?? []) as DisciplinaComTurmas[];
}

/**
 * Lista departamentos disponíveis para popular o filtro da SearchBar.
 * Executada em Server Components.
 */
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

  for (const row of data ?? []) {
    const departamento = row.departamento?.trim();

    if (departamento) {
      departamentos.add(departamento);
    }
  }

  return Array.from(departamentos);
}
