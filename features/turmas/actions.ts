'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import * as v from 'valibot'

import { captureUnexpectedError } from '@/lib/observability/capture-unexpected-error'
import { getIdSuffix, writeSafeLog } from '@/lib/observability/safe-logger'
import { createAbuseFingerprint } from '@/lib/security/abuse-fingerprint'
import { createClient } from '@/lib/supabase/server'

const WHATSAPP_INVITE_REGEX =
  /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+\/?$/

const honeypotSchema = v.optional(
  v.pipe(v.string(), v.maxLength(200, 'Dados inválidos.')),
  '',
)

const adicionarLinkSchema = v.object({
  turmaId: v.pipe(v.string(), v.uuid('Turma inválida.')),
  url: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Informe o link do grupo.'),
    v.regex(
      WHATSAPP_INVITE_REGEX,
      'O link deve começar com https://chat.whatsapp.com/',
    ),
  ),
  contactReference: honeypotSchema,
})

const denunciarLinkSchema = v.object({
  linkId: v.pipe(v.string(), v.uuid('Link inválido.')),
  motivo: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(10, 'Informe um motivo com pelo menos 10 caracteres.'),
    v.maxLength(150, 'O motivo deve ter no máximo 150 caracteres.'),
  ),
  contactReference: honeypotSchema,
})

export type TurmaActionCode =
  | 'ADDED'
  | 'REPORTED'
  | 'DEACTIVATED'
  | 'VALIDATION_ERROR'
  | 'ACTIVE_LINK_EXISTS'
  | 'RATE_LIMITED'
  | 'DUPLICATE_REPORT'
  | 'INACTIVE_LINK'
  | 'NOT_FOUND'
  | 'HONEYPOT_TRIGGERED'
  | 'CONFIGURATION_ERROR'
  | 'DATABASE_ERROR'

export type TurmaActionResult =
  | { ok: true; code: TurmaActionCode; message: string }
  | { ok: false; code: TurmaActionCode; message: string }

function validationError(message: string): TurmaActionResult {
  return { ok: false, code: 'VALIDATION_ERROR', message }
}

function honeypotResponse(): TurmaActionResult {
  writeSafeLog('warn', {
    event: 'public_form_rejected',
    code: 'HONEYPOT_TRIGGERED',
    environment: process.env.CONTEXT ?? process.env.NODE_ENV,
  })

  // Resposta deliberadamente genérica para não confirmar o mecanismo ao bot.
  return {
    ok: true,
    code: 'HONEYPOT_TRIGGERED',
    message: 'Solicitação recebida.',
  }
}

async function getFingerprint(
  actionScope: 'add_link' | 'report_link',
): Promise<string | null> {
  const headerStore = await headers()
  const result = createAbuseFingerprint(headerStore, actionScope)

  if (result.ok) return result.fingerprint

  captureUnexpectedError(new Error(`Abuse protection ${result.code}`), {
    operation: `abuse-fingerprint.${actionScope}`,
    subsystem: 'security',
    tags: { code: result.code },
  })
  writeSafeLog('error', {
    event: 'abuse_fingerprint_unavailable',
    code: result.code,
    environment: process.env.CONTEXT ?? process.env.NODE_ENV,
  })
  return null
}

function mapAddResult(result: unknown): TurmaActionResult {
  if (result === 'added') {
    return { ok: true, code: 'ADDED', message: 'Link adicionado com sucesso.' }
  }
  if (result === 'active_link_exists') {
    return {
      ok: false,
      code: 'ACTIVE_LINK_EXISTS',
      message: 'Esta turma já possui um grupo ativo.',
    }
  }
  if (result === 'rate_limited') {
    return {
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Não foi possível concluir agora. Tente novamente mais tarde.',
    }
  }
  if (result === 'not_found') {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'A turma informada não está disponível.',
    }
  }
  return {
    ok: false,
    code: 'DATABASE_ERROR',
    message: 'Não foi possível adicionar o link. Tente novamente.',
  }
}

function mapReportResult(result: unknown): TurmaActionResult {
  if (result === 'reported') {
    return {
      ok: true,
      code: 'REPORTED',
      message: 'Denúncia registrada com sucesso.',
    }
  }
  if (result === 'deactivated') {
    return {
      ok: true,
      code: 'DEACTIVATED',
      message: 'Denúncia registrada. O link foi desativado para revisão.',
    }
  }
  if (result === 'duplicate') {
    return {
      ok: false,
      code: 'DUPLICATE_REPORT',
      message: 'Esta conexão já enviou uma denúncia recente para este link.',
    }
  }
  if (result === 'rate_limited') {
    return {
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Não foi possível concluir agora. Tente novamente mais tarde.',
    }
  }
  if (result === 'inactive') {
    return {
      ok: false,
      code: 'INACTIVE_LINK',
      message: 'Este link não está mais disponível para denúncia.',
    }
  }
  if (result === 'not_found') {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'Este link não está mais disponível.',
    }
  }
  return {
    ok: false,
    code: 'DATABASE_ERROR',
    message: 'Não foi possível registrar a denúncia. Tente novamente.',
  }
}

export async function adicionarLink(
  turmaId: string,
  url: string,
  contactReference = '',
): Promise<TurmaActionResult> {
  const parsed = v.safeParse(adicionarLinkSchema, {
    turmaId,
    url,
    contactReference,
  })

  if (!parsed.success) {
    return validationError(parsed.issues[0]?.message ?? 'Dados inválidos.')
  }

  if (parsed.output.contactReference.trim()) {
    return honeypotResponse()
  }

  const fingerprint = await getFingerprint('add_link')
  if (!fingerprint) {
    return {
      ok: false,
      code: 'CONFIGURATION_ERROR',
      message: 'Não foi possível concluir agora. Tente novamente mais tarde.',
    }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('add_link_secure', {
      p_turma_id: parsed.output.turmaId,
      p_url_whatsapp: parsed.output.url,
      p_reporter_fingerprint: fingerprint,
    })

    if (error) {
      if (error.code !== '22023') {
        captureUnexpectedError(error, {
          operation: 'adicionarLink.rpc',
          subsystem: 'supabase',
          tags: { database_error_code: error.code || 'unknown' },
        })
      }
      writeSafeLog('error', {
        event: 'add_link_failed',
        code: error.code || 'DATABASE_ERROR',
        resourceIdSuffix: getIdSuffix(parsed.output.turmaId),
        environment: process.env.CONTEXT ?? process.env.NODE_ENV,
      })
      return mapAddResult(null)
    }

    const result = mapAddResult(data)
    if (result.ok) revalidatePath('/')
    return result
  } catch (error) {
    captureUnexpectedError(error, {
      operation: 'adicionarLink',
      subsystem: 'server-action',
    })
    writeSafeLog('error', {
      event: 'add_link_failed',
      code: 'UNEXPECTED_ERROR',
      resourceIdSuffix: getIdSuffix(parsed.output.turmaId),
      environment: process.env.CONTEXT ?? process.env.NODE_ENV,
    })
    return mapAddResult(null)
  }
}

export async function denunciarLink(
  linkId: string,
  motivo: string,
  contactReference = '',
): Promise<TurmaActionResult> {
  const parsed = v.safeParse(denunciarLinkSchema, {
    linkId,
    motivo,
    contactReference,
  })

  if (!parsed.success) {
    return validationError(parsed.issues[0]?.message ?? 'Dados inválidos.')
  }

  if (parsed.output.contactReference.trim()) {
    return honeypotResponse()
  }

  const fingerprint = await getFingerprint('report_link')
  if (!fingerprint) {
    return {
      ok: false,
      code: 'CONFIGURATION_ERROR',
      message: 'Não foi possível concluir agora. Tente novamente mais tarde.',
    }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('report_link_secure', {
      p_link_id: parsed.output.linkId,
      p_motivo: parsed.output.motivo,
      p_reporter_fingerprint: fingerprint,
    })

    if (error) {
      if (error.code !== '22023') {
        captureUnexpectedError(error, {
          operation: 'denunciarLink.rpc',
          subsystem: 'supabase',
          tags: { database_error_code: error.code || 'unknown' },
        })
      }
      writeSafeLog('error', {
        event: 'report_link_failed',
        code: error.code || 'DATABASE_ERROR',
        resourceIdSuffix: getIdSuffix(parsed.output.linkId),
        environment: process.env.CONTEXT ?? process.env.NODE_ENV,
      })
      return mapReportResult(null)
    }

    const result = mapReportResult(data)
    if (result.ok) revalidatePath('/')
    return result
  } catch (error) {
    captureUnexpectedError(error, {
      operation: 'denunciarLink',
      subsystem: 'server-action',
    })
    writeSafeLog('error', {
      event: 'report_link_failed',
      code: 'UNEXPECTED_ERROR',
      resourceIdSuffix: getIdSuffix(parsed.output.linkId),
      environment: process.env.CONTEXT ?? process.env.NODE_ENV,
    })
    return mapReportResult(null)
  }
}
