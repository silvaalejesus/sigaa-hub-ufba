import type { Breadcrumb, Event } from '@sentry/nextjs'

const DEFAULT_TRACES_SAMPLE_RATE = 0.1
const REDACTED_VALUE = '[redacted]'

const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|set-cookie|token|secret|password|api[-_]?key|service[-_]?role|anon[-_]?key|dsn|supabase|motivo|reason|descricao|description|form(?:data)?|body|payload|csv|whatsapp|url_whatsapp/i

const WHATSAPP_INVITE_PATTERN =
  /https?:\/\/(?:www\.)?chat\.whatsapp\.com\/[A-Za-z0-9_-]+(?:\?[^\s]*)?/gi
const BEARER_TOKEN_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi

type SentryEnvironment = 'local' | 'preview' | 'production'
type SerializableRecord = Record<string, unknown>

function isRecord(value: unknown): value is SerializableRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeUrl(rawUrl: string): string {
  if (rawUrl.match(WHATSAPP_INVITE_PATTERN)) {
    return 'https://chat.whatsapp.com/[redacted]'
  }

  try {
    const url = new URL(rawUrl)

    if (url.hostname.endsWith('.supabase.co')) {
      return `${url.protocol}//${url.hostname}/[redacted]`
    }

    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return rawUrl
  }
}

function sanitizeString(value: string): string {
  return value
    .replace(WHATSAPP_INVITE_PATTERN, 'https://chat.whatsapp.com/[redacted]')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [redacted]')
    .replace(JWT_PATTERN, REDACTED_VALUE)
    .replace(URL_PATTERN, (url) => sanitizeUrl(url))
}

function sanitizeValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED_VALUE
  }

  if (typeof value === 'string') {
    return sanitizeString(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item))
  }

  if (!isRecord(value)) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeValue(entryValue, entryKey),
    ]),
  )
}


function sanitizeException(exception: unknown): unknown {
  if (!isRecord(exception) || !Array.isArray(exception.values)) {
    return exception
  }

  return {
    ...exception,
    values: exception.values.map((exceptionValue) => {
      if (!isRecord(exceptionValue)) {
        return exceptionValue
      }

      return {
        ...exceptionValue,
        value:
          typeof exceptionValue.value === 'string'
            ? 'Unexpected application error'
            : exceptionValue.value,
      }
    }),
  }
}

export function getSentryEnvironment(): SentryEnvironment {
  const vercelEnvironment =
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV

  if (vercelEnvironment === 'production') {
    return 'production'
  }

  if (vercelEnvironment === 'preview') {
    return 'preview'
  }

  return 'local'
}

export function getSentryTracesSampleRate(): number {
  const configuredValue = process.env.SENTRY_TRACES_SAMPLE_RATE

  if (!configuredValue) {
    return DEFAULT_TRACES_SAMPLE_RATE
  }

  const parsedValue = Number(configuredValue)

  if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 1) {
    return DEFAULT_TRACES_SAMPLE_RATE
  }

  return parsedValue
}

export function isSentryEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) && getSentryEnvironment() !== 'local'
}

export function sanitizeSentryEvent<T extends Event>(event: T): T {
  const sanitizedEvent = sanitizeValue(event)

  if (!isRecord(sanitizedEvent)) {
    return event
  }

  const request = isRecord(sanitizedEvent.request)
    ? {
        ...sanitizedEvent.request,
        cookies: undefined,
        data: undefined,
        env: undefined,
        headers: undefined,
        query_string: undefined,
      }
    : sanitizedEvent.request

  return {
    ...sanitizedEvent,
    exception: sanitizeException(sanitizedEvent.exception),
    message:
      typeof sanitizedEvent.message === 'string'
        ? 'Unexpected application error'
        : sanitizedEvent.message,
    request,
    server_name: undefined,
    user: undefined,
  } as T
}

export function sanitizeSentryBreadcrumb(
  breadcrumb: Breadcrumb,
): Breadcrumb | null {
  const category = breadcrumb.category ?? ''

  if (category.startsWith('console') || category.startsWith('ui.')) {
    return null
  }

  const sanitizedBreadcrumb = sanitizeValue(breadcrumb)
  return isRecord(sanitizedBreadcrumb)
    ? (sanitizedBreadcrumb as Breadcrumb)
    : breadcrumb
}
