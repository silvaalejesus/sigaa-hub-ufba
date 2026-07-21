import type { Breadcrumb, Event } from '@sentry/nextjs'

const DEFAULT_TRACES_SAMPLE_RATE = 0.1
const REDACTED_VALUE = '[redacted]'
const EXPECTED_CODES = new Set([
  'VALIDATION_ERROR',
  'ACTIVE_LINK_EXISTS',
  'RATE_LIMITED',
  'HONEYPOT_TRIGGERED',
  'DUPLICATE_REPORT',
  'INACTIVE_LINK',
  'NOT_FOUND',
])
const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|set-cookie|token|secret|password|api[-_]?key|service[-_]?role|anon[-_]?key|dsn|motivo|reason|descricao|description|form(?:data)?|body|payload|csv|whatsapp|url_whatsapp|fingerprint|client[-_]?ip|reporter/i
const WHATSAPP_INVITE_PATTERN =
  /https?:\/\/(?:www\.)?chat\.whatsapp\.com\/[A-Za-z0-9_-]+(?:\?[^\s]*)?/gi
const BEARER_TOKEN_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const FINGERPRINT_PATTERN = /\b[0-9a-f]{64}\b/gi

type SentryEnvironment = 'local' | 'preview' | 'production'
type SerializableRecord = Record<string, unknown>

function isRecord(value: unknown): value is SerializableRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    if (url.hostname === 'chat.whatsapp.com') {
      return 'https://chat.whatsapp.com/[redacted]'
    }
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return rawUrl
  }
}

export function sanitizeObservabilityString(value: string): string {
  return value
    .replace(WHATSAPP_INVITE_PATTERN, 'https://chat.whatsapp.com/[redacted]')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [redacted]')
    .replace(JWT_PATTERN, REDACTED_VALUE)
    .replace(FINGERPRINT_PATTERN, '[fingerprint-redacted]')
    .replace(IPV4_PATTERN, '[ip-redacted]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => sanitizeUrl(url))
}

function sanitizeValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) return REDACTED_VALUE
  if (typeof value === 'string') return sanitizeObservabilityString(value)
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item))
  if (!isRecord(value)) return value

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeValue(entryValue, entryKey),
    ]),
  )
}

function containsExpectedCode(event: Event): boolean {
  const candidates = [
    event.message,
    isRecord(event.tags) ? event.tags.code : undefined,
    isRecord(event.tags) ? event.tags.error_code : undefined,
  ]

  return candidates.some(
    (candidate) => typeof candidate === 'string' && EXPECTED_CODES.has(candidate),
  )
}

export function getSentryEnvironment(): SentryEnvironment {
  const context = process.env.CONTEXT
  if (context === 'production') return 'production'
  if (context === 'deploy-preview' || context === 'branch-deploy') return 'preview'
  return 'local'
}

export function getSentryTracesSampleRate(): number {
  const parsed = Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : DEFAULT_TRACES_SAMPLE_RATE
}

export function isSentryEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) &&
    getSentryEnvironment() !== 'local'
}

export function sanitizeSentryEvent<T extends Event>(event: T): T | null {
  if (containsExpectedCode(event)) return null

  const sanitized = sanitizeValue(event)
  if (!isRecord(sanitized)) return event

  return {
    ...sanitized,
    message: typeof sanitized.message === 'string'
      ? 'Unexpected application error'
      : sanitized.message,
    request: isRecord(sanitized.request)
      ? {
          ...sanitized.request,
          cookies: undefined,
          data: undefined,
          env: undefined,
          headers: undefined,
          query_string: undefined,
          url:
            typeof sanitized.request.url === 'string'
              ? sanitizeUrl(sanitized.request.url)
              : sanitized.request.url,
        }
      : sanitized.request,
    server_name: undefined,
    user: undefined,
  } as T
}

export function sanitizeSentryBreadcrumb(
  breadcrumb: Breadcrumb,
): Breadcrumb | null {
  const category = breadcrumb.category ?? ''
  if (category.startsWith('console') || category.startsWith('ui.')) return null

  const sanitized = sanitizeValue(breadcrumb)
  return isRecord(sanitized) ? (sanitized as Breadcrumb) : breadcrumb
}
