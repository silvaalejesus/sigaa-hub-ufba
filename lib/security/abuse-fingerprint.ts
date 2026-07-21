import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'

export type AbuseActionScope = 'add_link' | 'report_link'

export interface HeaderReader {
  get(name: string): string | null
}

export type FingerprintResult =
  | { ok: true; fingerprint: string }
  | { ok: false; code: 'MISSING_SECRET' | 'MISSING_CLIENT_IP' }

const NETLIFY_CLIENT_IP_HEADER = 'x-nf-client-connection-ip'
const LEGACY_SECRET_NAME = 'REPORT_FINGERPRINT_SECRET'

function stripIpDecorations(rawValue: string): string {
  const value = rawValue.trim()

  const bracketedIpv6 = value.match(/^\[([^\]]+)](?::\d+)?$/)
  if (bracketedIpv6) {
    return bracketedIpv6[1]?.split('%')[0] ?? ''
  }

  const ipv4WithPort = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/)
  if (ipv4WithPort) {
    return ipv4WithPort[1] ?? ''
  }

  return value.split('%')[0] ?? ''
}

export function normalizeIpCandidate(rawValue: string | null): string | null {
  if (!rawValue) {
    return null
  }

  for (const candidate of rawValue.split(',')) {
    const normalized = stripIpDecorations(candidate)
    if (isIP(normalized) !== 0) {
      return normalized.toLowerCase()
    }
  }

  return null
}

export function getTrustedClientIp(
  headerStore: HeaderReader,
  environment = process.env.NODE_ENV,
): string | null {
  const netlifyIp = normalizeIpCandidate(
    headerStore.get(NETLIFY_CLIENT_IP_HEADER),
  )

  if (netlifyIp) {
    return netlifyIp
  }

  // Em produção, nenhum header genérico de proxy é aceito. Em desenvolvimento,
  // o fallback facilita testes locais com Netlify Dev/Next sem alterar a regra
  // de confiança do ambiente publicado.
  if (environment !== 'production') {
    return (
      normalizeIpCandidate(headerStore.get('x-forwarded-for')) ??
      normalizeIpCandidate(headerStore.get('x-real-ip')) ??
      '127.0.0.1'
    )
  }

  return null
}

export function getAbuseFingerprintSecret(
  environment: NodeJS.ProcessEnv = process.env,
): string | null {
  const secret =
    environment.ABUSE_FINGERPRINT_SECRET?.trim() ||
    environment[LEGACY_SECRET_NAME]?.trim()

  return secret && secret.length >= 32 ? secret : null
}

export function createAbuseFingerprint(
  headerStore: HeaderReader,
  actionScope: AbuseActionScope,
  environment: NodeJS.ProcessEnv = process.env,
): FingerprintResult {
  const secret = getAbuseFingerprintSecret(environment)
  if (!secret) {
    return { ok: false, code: 'MISSING_SECRET' }
  }

  const normalizedIp = getTrustedClientIp(
    headerStore,
    environment.NODE_ENV,
  )
  if (!normalizedIp) {
    return { ok: false, code: 'MISSING_CLIENT_IP' }
  }

  return {
    ok: true,
    fingerprint: createHmac('sha256', secret)
      .update(`${actionScope}\n${normalizedIp}`)
      .digest('hex'),
  }
}
