import { createClient } from '@/lib/supabase/server'
import type { DisciplinaComTurmas } from '@/types/database'

const SEMESTRE_VIGENTE = '2026.1'
const MAX_RESULTADOS = 20

/**
 * Busca disciplinas com suas turmas e links do semestre vigente.
 * Filtra por nome ou código quando `query` for fornecida.
 * Executada exclusivamente em Server Components / Server Actions.
 */
export async function buscarDisciplinas(
  query?: string,
): Promise<DisciplinaComTurmas[]> {
  const supabase = await createClient()

  const trimmed = query?.trim() ?? ''

  let request = supabase
    .from('disciplinas')
    .select(
      `
      id,
      codigo,
      nome,
      departamento,
      created_at,
      turmas (
        id,
        codigo_turma,
        professor,
        semestre,
        disciplina_id,
        created_at,
        links (
          id,
          url_whatsapp
        )
      )
    `,
    )
    .eq('turmas.semestre', SEMESTRE_VIGENTE)
    .eq('turmas.links.is_active', true)
    .order('nome', { ascending: true })
    .limit(MAX_RESULTADOS)

  if (trimmed.length > 0) {
    // ilike: busca case-insensitive em nome OU código
    request = request.or(
      `nome.ilike.%${trimmed}%,codigo.ilike.%${trimmed}%`,
    )
  }

  const { data, error } = await request

  if (error) {
    console.error('[SIGAA Hub] Erro ao buscar disciplinas:', error.message)
    return []
  }

  return (data ?? []) as DisciplinaComTurmas[]
}
