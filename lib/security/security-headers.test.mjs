import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildContentSecurityPolicyReportOnly,
  buildSecurityHeaders,
} from './security-headers.mjs'

test('gera os headers de segurança obrigatórios', () => {
  const headers = new Map(
    buildSecurityHeaders({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SENTRY_DSN: 'https://example.ingest.sentry.io/1',
    }).map(({ key, value }) => [key, value]),
  )

  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(headers.get('X-Frame-Options'), 'DENY')
  assert.equal(headers.get('Cross-Origin-Opener-Policy'), 'same-origin')
  assert.ok(headers.has('Content-Security-Policy-Report-Only'))
})

test('CSP não usa wildcard amplo nem unsafe-eval', () => {
  const csp = buildContentSecurityPolicyReportOnly({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  })

  assert.equal(csp.includes("'unsafe-eval'"), false)
  assert.equal(csp.includes('connect-src *'), false)
  assert.equal(csp.includes('script-src *'), false)
  assert.match(csp, /https:\/\/example\.supabase\.co/)
})
