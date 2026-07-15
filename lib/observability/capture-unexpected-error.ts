import * as Sentry from '@sentry/nextjs'

export type SafeSentryTagValue = string | number | boolean

interface CaptureUnexpectedErrorOptions {
  operation: string
  subsystem: string
  tags?: Record<string, SafeSentryTagValue>
}

export function captureUnexpectedError(
  error: unknown,
  { operation, subsystem, tags = {} }: CaptureUnexpectedErrorOptions,
): void {
  const sanitizedError = new Error(`Unexpected failure in ${operation}`)

  if (error instanceof Error && error.stack) {
    const [, ...stackFrames] = error.stack.split('\n')
    sanitizedError.stack = [sanitizedError.toString(), ...stackFrames].join('\n')
  }

  Sentry.withScope((scope) => {
    scope.setLevel('error')
    scope.setTag('operation', operation)
    scope.setTag('subsystem', subsystem)

    for (const [key, value] of Object.entries(tags)) {
      scope.setTag(key, value)
    }

    Sentry.captureException(sanitizedError)
  })
}
