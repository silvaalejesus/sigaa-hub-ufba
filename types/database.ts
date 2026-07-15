/**
 * Tipos TypeScript derivados do schema do SIGAA Hub.
 *
 * Reflectem as tabelas consumidas pelo front-end e a RPC usada para denúncias.
 */
export type Database = {
  public: {
    Tables: {
      disciplinas: {
        Row: Disciplina
        Insert: Omit<Disciplina, 'id' | 'created_at'>
        Update: Partial<Omit<Disciplina, 'id' | 'created_at'>>
        Relationships: []
      }
      turmas: {
        Row: Turma
        Insert: Omit<Turma, 'id' | 'created_at'>
        Update: Partial<Omit<Turma, 'id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: 'turmas_disciplina_fk'
            columns: ['disciplina_id']
            isOneToOne: false
            referencedRelation: 'disciplinas'
            referencedColumns: ['id']
          },
        ]
      }
      links: {
        Row: Link
        Insert: Pick<Link, 'turma_id' | 'url_whatsapp'>
        Update: Partial<Omit<Link, 'id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: 'links_turma_fk'
            columns: ['turma_id']
            isOneToOne: false
            referencedRelation: 'turmas'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
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
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Disciplina = {
  id: string
  codigo: string
  nome: string
  departamento: string | null
  created_at: string
}

export type Turma = {
  id: string
  disciplina_id: string
  codigo_turma: string
  professor: string | null
  semestre: string
  created_at: string
}

export type Link = {
  id: string
  turma_id: string
  url_whatsapp: string
  reports: number
  is_active: boolean
  created_at: string
}

/** Tipo enriquecido retornado pelas queries de listagem. */
export type DisciplinaComTurmas = Disciplina & {
  turmas: (Turma & { links: Pick<Link, 'id' | 'url_whatsapp'>[] })[]
}
