/** Tipos de domínio usados pelo SIGAA Hub. */
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
        Insert: Omit<LinkReport, 'id' | 'created_at'>
        Update: never
      }
      abuse_events: {
        Row: AbuseEvent
        Insert: Omit<AbuseEvent, 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: {
      add_link_secure: {
        Args: {
          p_turma_id: string
          p_url_whatsapp: string
          p_reporter_fingerprint: string
        }
        Returns: string
      }
      report_link_secure: {
        Args: {
          p_link_id: string
          p_motivo: string
          p_reporter_fingerprint: string
        }
        Returns: string
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
  inactive_reason: string | null
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

export interface AbuseEvent {
  id: number
  action_scope: string
  reporter_fingerprint: string
  resource_id: string | null
  outcome: string
  created_at: string
}

export interface DisciplinaComTurmas extends Disciplina {
  turmas: (Turma & {
    links: Pick<Link, 'id' | 'url_whatsapp' | 'reports' | 'is_active'>[]
  })[]
}
