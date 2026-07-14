'use server'

import { createHmac } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import * as v from 'valibot'

import { createClient } from '@/lib/supabase/server'

const WHATSAPP_INVITE_REGEX =
  /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+\/?$/

const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/

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
})

const denunciarLinkSchema = v.object({
  linkId: v.pipe(v.string(), v.uuid('Link inválido.')),
  motivo: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(10, 'Informe um motivo com pelo menos 10 caracteres.'),
    v.maxLength(150, 'O motivo deve ter no máximo 150 caracteres.'),
  ),
})

interface HeaderReader {
  get(name: string): string | null
}

interface ReportMetadata {
  reporterFingerprint: string | null
  countryCode: string | null
}

export type TurmaActionResult =
  | {
      ok: true
      message: string
    }
  | {
      ok: false
      message: string
    }

function getFirstForwardedIp(headerStore: HeaderReader): string | null {
  const forwardedFor =
    headerStore.get('x-vercel-forwarded-for') ??
    headerStore.get('x-forwarded-for') ??
    headerStore.get('x-real-ip')

  const firstIp = forwardedFor?.split(',')[0]?.trim()

  return firstIp || null
}

function getCountryCode(headerStore: HeaderReader): string | null {
  const countryCode = headerStore
    .get('x-vercel-ip-country')
    ?.trim()
    .toUpperCase()

  if (!countryCode || !COUNTRY_CODE_REGEX.test(countryCode)) {
    return null
  }

  return countryCode
}

function createReporterFingerprint(
  headerStore: HeaderReader,
): string | null {
  const secret = process.env.REPORT_FINGERPRINT_SECRET?.trim()
  const clientIp = getFirstForwardedIp(headerStore)

  if (!secret || !clientIp) {
    return null
  }

  const userAgent =
    headerStore.get('user-agent')?.trim().slice(0, 512) ?? 'unknown'

  return createHmac('sha256', secret)
    .update(`${clientIp}\n${userAgent}`)
    .digest('hex')
}

function getReportMetadata(headerStore: HeaderReader): ReportMetadata {
  return {
    reporterFingerprint: createReporterFingerprint(headerStore),
    countryCode: getCountryCode(headerStore),
  }
}

function getReportErrorMessage(code: string | undefined): string {
  if (code === 'P0001') {
    return 'Esta conexão já denunciou este link.'
  }

  if (code === 'P0002') {
    return 'Este link não está mais disponível para denúncia.'
  }

  if (code === '22004' || code === '22023') {
    return 'Os dados da denúncia são inválidos.'
  }

  return 'Não foi possível registrar a denúncia. Tente novamente.'
}

export async function adicionarLink(
  turmaId: string,
  url: string,
): Promise<TurmaActionResult> {
  try {
    const parsed = v.safeParse(adicionarLinkSchema, {
      turmaId,
      url,
    })

    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.issues[0]?.message ?? 'Dados inválidos.',
      }
    }

    const supabase = await createClient()
    const { error } = await supabase.from('links').insert({
      turma_id: parsed.output.turmaId,
      url_whatsapp: parsed.output.url,
    })

    if (error) {
      if (error.code === '23505') {
        return {
          ok: false,
          message: 'Esta turma já possui esse link cadastrado.',
        }
      }

      if (error.code === '23514') {
        return {
          ok: false,
          message:
            'Link inválido. Use um convite que comece com https://chat.whatsapp.com/',
        }
      }

      console.error('[SIGAA Hub] Erro ao adicionar link:', error)

      return {
        ok: false,
        message: 'Não foi possível adicionar o link. Tente novamente.',
      }
    }

    revalidatePath('/')

    return {
      ok: true,
      message: 'Link adicionado com sucesso.',
    }
  } catch (error) {
    console.error('[SIGAA Hub] Erro inesperado ao adicionar link:', error)

    return {
      ok: false,
      message: 'Erro inesperado ao adicionar o link.',
    }
  }
}

export async function denunciarLink(
  linkId: string,
  motivo: string,
): Promise<TurmaActionResult> {
  try {
    const parsed = v.safeParse(denunciarLinkSchema, {
      linkId,
      motivo,
    })

    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.issues[0]?.message ?? 'Dados inválidos.',
      }
    }

    const headerStore = await headers()
    const metadata = getReportMetadata(headerStore)
    const supabase = await createClient()

    const { error } = await supabase.rpc('incrementar_reports_link', {
      p_link_id: parsed.output.linkId,
      p_motivo: parsed.output.motivo,
      p_reporter_fingerprint: metadata.reporterFingerprint,
      p_country_code: metadata.countryCode,
    })

    if (error) {
      console.error(
        '[SIGAA Hub] Erro ao executar incrementar_reports_link:',
        {
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message,
          linkId: parsed.output.linkId,
        },
      )

      return {
        ok: false,
        message: getReportErrorMessage(error.code),
      }
    }

    console.info('[SIGAA Hub] Denúncia registrada:', {
      linkId: parsed.output.linkId,
      countryCode: metadata.countryCode,
      hasReporterFingerprint: Boolean(metadata.reporterFingerprint),
      receivedAt: new Date().toISOString(),
    })

    revalidatePath('/')

    return {
      ok: true,
      message: 'Denúncia registrada com sucesso.',
    }
  } catch (error) {
    console.error('[SIGAA Hub] Erro inesperado ao denunciar link:', error)

    return {
      ok: false,
      message: 'Erro inesperado ao registrar denúncia.',
    }
  }
}
