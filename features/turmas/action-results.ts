import { REPORTS_DEACTIVATION_THRESHOLD } from './constants.ts'

export type TurmaActionFailureCode =
  | 'VALIDATION_ERROR'
  | 'ACTIVE_LINK_EXISTS'
  | 'URL_ALREADY_REGISTERED'
  | 'RATE_LIMITED'
  | 'DUPLICATE_REPORT'
  | 'LINK_INACTIVE'
  | 'LINK_NOT_FOUND'
  | 'HONEYPOT_TRIGGERED'
  | 'CONFIGURATION_ERROR'
  | 'DATABASE_ERROR'

export type TurmaActionFailure = {
  ok: false
  code: TurmaActionFailureCode
  message: string
}

export type AddLinkSuccess = {
  ok: true
  status: 'added'
  message: string
}

export type AddLinkActionResult = AddLinkSuccess | TurmaActionFailure

export type ReportLinkSuccess = {
  ok: true
  status: 'reported' | 'deactivated'
  reportsCount: number
  maxReports: typeof REPORTS_DEACTIVATION_THRESHOLD
  isActive: boolean
  message: string
}

export type ReportLinkActionResult = ReportLinkSuccess | TurmaActionFailure

export type ReportRpcRow = {
  result_status: string
  reports_count: number | null
  is_active: boolean | null
}

export function mapAddRpcResult(result: unknown): AddLinkActionResult {
  if (result === 'added') {
    return { ok: true, status: 'added', message: 'Link adicionado com sucesso.' }
  }

  if (result === 'active_link_exists') {
    return {
      ok: false,
      code: 'ACTIVE_LINK_EXISTS',
      message: 'Esta turma já possui um grupo ativo.',
    }
  }

  if (result === 'url_already_registered') {
    return {
      ok: false,
      code: 'URL_ALREADY_REGISTERED',
      message:
        'Este link já foi cadastrado anteriormente para esta turma. Crie ou informe um novo convite.',
    }
  }

  if (result === 'rate_limited') {
    return {
      ok: false,
      code: 'RATE_LIMITED',
      message:
        'Muitas tentativas foram realizadas. Aguarde um pouco antes de tentar novamente.',
    }
  }

  if (result === 'not_found') {
    return {
      ok: false,
      code: 'LINK_NOT_FOUND',
      message: 'A turma informada não foi encontrada.',
    }
  }

  return databaseFailure('Não foi possível adicionar o link. Tente novamente.')
}

export function parseReportRpcRow(data: unknown): ReportRpcRow | null {
  const candidate = Array.isArray(data) ? data[0] : data

  if (!candidate || typeof candidate !== 'object') return null

  const row = candidate as Record<string, unknown>
  const reportsCount = row.reports_count
  const isActive = row.is_active

  if (typeof row.result_status !== 'string') return null
  if (reportsCount !== null && typeof reportsCount !== 'number') return null
  if (isActive !== null && typeof isActive !== 'boolean') return null

  return {
    result_status: row.result_status,
    reports_count: reportsCount,
    is_active: isActive,
  }
}

export function mapReportRpcResult(row: ReportRpcRow | null): ReportLinkActionResult {
  if (
    row?.result_status === 'reported' &&
    Number.isInteger(row.reports_count) &&
    row.reports_count !== null &&
    row.reports_count >= 1 &&
    row.reports_count < REPORTS_DEACTIVATION_THRESHOLD &&
    row.is_active === true
  ) {
    return {
      ok: true,
      status: 'reported',
      reportsCount: row.reports_count,
      maxReports: REPORTS_DEACTIVATION_THRESHOLD,
      isActive: true,
      message: `Denúncia registrada. Este link possui agora ${row.reports_count} de ${REPORTS_DEACTIVATION_THRESHOLD} denúncias.`,
    }
  }

  if (
    row?.result_status === 'deactivated' &&
    row.reports_count === REPORTS_DEACTIVATION_THRESHOLD &&
    row.is_active === false
  ) {
    return {
      ok: true,
      status: 'deactivated',
      reportsCount: REPORTS_DEACTIVATION_THRESHOLD,
      maxReports: REPORTS_DEACTIVATION_THRESHOLD,
      isActive: false,
      message:
        'Este link recebeu 3 de 3 denúncias, foi retirado temporariamente da listagem e passará por análise.',
    }
  }

  if (row?.result_status === 'duplicate') {
    return {
      ok: false,
      code: 'DUPLICATE_REPORT',
      message: 'Esta conexão já enviou uma denúncia recente para este link.',
    }
  }

  if (row?.result_status === 'rate_limited') {
    return {
      ok: false,
      code: 'RATE_LIMITED',
      message:
        'Muitas tentativas foram realizadas. Aguarde um pouco antes de tentar novamente.',
    }
  }

  if (row?.result_status === 'inactive') {
    return {
      ok: false,
      code: 'LINK_INACTIVE',
      message: 'Este link não está mais disponível para denúncia.',
    }
  }

  if (row?.result_status === 'not_found') {
    return {
      ok: false,
      code: 'LINK_NOT_FOUND',
      message: 'Este link não foi encontrado.',
    }
  }

  return databaseFailure('Não foi possível registrar a denúncia. Tente novamente.')
}

export function databaseFailure(message: string): TurmaActionFailure {
  return { ok: false, code: 'DATABASE_ERROR', message }
}
