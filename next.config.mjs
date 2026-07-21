import { withSentryConfig } from '@sentry/nextjs'

import { buildSecurityHeaders } from './lib/security/security-headers.mjs'

const DEFAULT_SENTRY_TRACES_SAMPLE_RATE = 0.1

function getValidatedTracesSampleRate() {
  const configuredValue = process.env.SENTRY_TRACES_SAMPLE_RATE
  if (!configuredValue) return DEFAULT_SENTRY_TRACES_SAMPLE_RATE

  const parsedValue = Number(configuredValue)
  return Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 1
    ? parsedValue
    : DEFAULT_SENTRY_TRACES_SAMPLE_RATE
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    SENTRY_TRACES_SAMPLE_RATE: String(getValidatedTracesSampleRate()),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: buildSecurityHeaders(process.env),
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
