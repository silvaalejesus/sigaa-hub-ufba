type SafeLogLevel = 'info' | 'warn' | 'error'

export interface SafeLogEvent {
  event: string
  code?: string
  resourceIdSuffix?: string
  environment?: string
}

const WHATSAPP_PATTERN = /https?:\/\/chat\.whatsapp\.com\/[^\s"'<>]+/gi
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const HEX_FINGERPRINT_PATTERN = /\b[0-9a-f]{64}\b/gi

export function sanitizeLogText(value: string): string {
  return value
    .replace(WHATSAPP_PATTERN, '[whatsapp-url-redacted]')
    .replace(IPV4_PATTERN, '[ip-redacted]')
    .replace(HEX_FINGERPRINT_PATTERN, '[fingerprint-redacted]')
}

export function getIdSuffix(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  return value.slice(-8)
}

export function writeSafeLog(
  level: SafeLogLevel,
  payload: SafeLogEvent,
): void {
  const safePayload = {
    event: sanitizeLogText(payload.event).slice(0, 80),
    code: payload.code ? sanitizeLogText(payload.code).slice(0, 80) : undefined,
    resourceIdSuffix: payload.resourceIdSuffix?.slice(-8),
    environment: payload.environment?.slice(0, 32),
  }

  const serialized = JSON.stringify(safePayload)
  if (level === 'error') console.error(serialized)
  else if (level === 'warn') console.warn(serialized)
  else console.info(serialized)
}
