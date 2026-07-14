/**
 * Tipos TypeScript derivados do schema do SIGAA Hub.
 * Refletem as tabelas e funções utilizadas pela aplicação no Supabase.
 */
export interface Database {
  public: {
    Tables: {
      disciplinas: {
        Row: Disciplina
        Insert: Omit<Disciplina, 'id' | 'created_at'>
        Update: Partial<Omit<Disciplina, 'id' | 'created_at'>>
      }
      turmas: {
        Row: Turma
        Insert: Omit<Turma, 'id' | 'created_at'>
        Update: Partial<Omit<Turma, 'id' | 'created_at'>>
      }
      links: {
        Row: Link
        Insert: Pick<Link, 'turma_id' | 'url_whatsapp'>
        Update: Partial<Omit<Link, 'id' | 'created_at'>>
      }
      link_reports: {
        Row: LinkReport
        Insert: Omit<LinkReport, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<
          Omit<LinkReport, 'id' | 'link_id' | 'created_at'>
        >
      }
    }
    Views: Record<string, never>
    Functions: {
      incrementar_reports_link: {
        Args: {
          p_link_id: string
          p_motivo: string
          p_reporter_fingerprint: string | null
          p_country_code: string | null
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
  }
}

export interface Disciplina {
  id: string
  codigo: string
  nome: string
  departamento: string | null
  created_at: string
}

export interface Turma {
  id: string
  disciplina_id: string
  codigo_turma: string
  professor: string | null
  semestre: string
  created_at: string
}

export interface Link {
  id: string
  turma_id: string
  url_whatsapp: string
  reports: number
  is_active: boolean
  created_at: string
}

export interface LinkReport {
  id: string
  link_id: string
  motivo: string
  reporter_fingerprint: string | null
  country_code: string | null
  created_at: string
}

/** Tipo enriquecido retornado pelas queries de listagem. */
export interface DisciplinaComTurmas extends Disciplina {
  turmas: (Turma & {
    links: Pick<Link, 'id' | 'url_whatsapp' | 'is_active'>[]
  })[]
}
