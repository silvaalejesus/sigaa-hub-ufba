export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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

export type ScraperRunStatus = 'running' | 'success' | 'partial' | 'failed'
export type ScraperTriggerSource =
  | 'manual'
  | 'github_actions'
  | 'local'
  | 'scheduled'

export interface ScraperRun {
  id: string
  status: ScraperRunStatus
  trigger_source: ScraperTriggerSource
  semester: string | null
  started_at: string
  finished_at: string | null
  departments_processed: number
  subjects_found: number
  classes_found: number
  subjects_upserted: number
  classes_upserted: number
  error_code: string | null
  error_message: string | null
  metadata: Json
  created_at: string
}

export interface PublicScraperStatusRow {
  last_run_status: ScraperRunStatus | null
  last_run_semester: string | null
  last_run_started_at: string | null
  last_run_finished_at: string | null
  last_successful_sync_at: string | null
  last_successful_started_at: string | null
  last_successful_finished_at: string | null
  last_successful_duration_seconds: number | null
}

export interface ReportLinkSecureRow {
  result_status:
    | 'reported'
    | 'deactivated'
    | 'duplicate'
    | 'rate_limited'
    | 'inactive'
    | 'not_found'
  reports_count: number | null
  is_active: boolean | null
}

type DisciplinaInsert = Omit<Disciplina, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}
type TurmaInsert = Omit<Turma, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}
type LinkInsert = Pick<Link, 'turma_id' | 'url_whatsapp'> &
  Partial<
    Pick<
      Link,
      'id' | 'reports' | 'is_active' | 'inactive_reason' | 'created_at'
    >
  >
type LinkReportInsert = Omit<LinkReport, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export interface ScraperRunInsert {
  id?: string
  status: ScraperRunStatus
  trigger_source?: ScraperTriggerSource
  semester?: string | null
  started_at?: string
  finished_at?: string | null
  departments_processed?: number
  subjects_found?: number
  classes_found?: number
  subjects_upserted?: number
  classes_upserted?: number
  error_code?: string | null
  error_message?: string | null
  metadata?: Json
  created_at?: string
}

export interface Database {
  public: {
    Tables: {
      disciplinas: {
        Row: Disciplina
        Insert: DisciplinaInsert
        Update: Partial<DisciplinaInsert>
        Relationships: []
      }
      turmas: {
        Row: Turma
        Insert: TurmaInsert
        Update: Partial<TurmaInsert>
        Relationships: [
          {
            foreignKeyName: 'turmas_disciplina_id_fkey'
            columns: ['disciplina_id']
            isOneToOne: false
            referencedRelation: 'disciplinas'
            referencedColumns: ['id']
          },
        ]
      }
      links: {
        Row: Link
        Insert: LinkInsert
        Update: Partial<LinkInsert>
        Relationships: [
          {
            foreignKeyName: 'links_turma_id_fkey'
            columns: ['turma_id']
            isOneToOne: false
            referencedRelation: 'turmas'
            referencedColumns: ['id']
          },
        ]
      }
      link_reports: {
        Row: LinkReport
        Insert: LinkReportInsert
        Update: Partial<LinkReportInsert>
        Relationships: [
          {
            foreignKeyName: 'link_reports_link_id_fkey'
            columns: ['link_id']
            isOneToOne: false
            referencedRelation: 'links'
            referencedColumns: ['id']
          },
        ]
      }
      scraper_runs: {
        Row: ScraperRun
        Insert: ScraperRunInsert
        Update: Partial<ScraperRunInsert>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      add_link_secure: {
        Args: {
          p_turma_id: string
          p_url_whatsapp: string
          p_reporter_fingerprint: string
        }
        Returns:
          | 'added'
          | 'active_link_exists'
          | 'url_already_registered'
          | 'rate_limited'
          | 'not_found'
      }
      report_link_secure: {
        Args: {
          p_link_id: string
          p_motivo: string
          p_reporter_fingerprint: string
        }
        Returns: ReportLinkSecureRow[]
      }
      get_public_scraper_status: {
        Args: { p_semester?: string | null }
        Returns: PublicScraperStatusRow[]
      }
      count_public_subjects: {
        Args: { p_semester: string }
        Returns: number
      }
      count_public_classes: {
        Args: { p_semester: string }
        Returns: number
      }
      count_public_active_links: {
        Args: { p_semester: string }
        Returns: number
      }
      app_health_check: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

/** Tipo enriquecido retornado pelas queries de listagem pública. */
export interface DisciplinaComTurmas extends Disciplina {
  turmas: (Turma & {
    links: Pick<
      Link,
      'id' | 'turma_id' | 'url_whatsapp' | 'reports' | 'is_active' | 'created_at'
    >[]
  })[]
}
