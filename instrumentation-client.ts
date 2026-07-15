import * as Sentry from '@sentry/nextjs'
import {
  getSentryEnvironment,
  getSentryTracesSampleRate,
  isSentryEnabled,
  sanitizeSentryBreadcrumb,
  sanitizeSentryEvent,
} from '@/lib/observability/sentry-options'

const enabled = isSentryEnabled()

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled,
  environment: getSentryEnvironment(),
  sendDefaultPii: false,
  tracesSampleRate: enabled ? getSentryTracesSampleRate() : 0,
  beforeSend: sanitizeSentryEvent,
  beforeSendTransaction: sanitizeSentryEvent,
  beforeBreadcrumb: sanitizeSentryBreadcrumb,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
