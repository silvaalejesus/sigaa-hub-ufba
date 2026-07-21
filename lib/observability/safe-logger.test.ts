import assert from 'node:assert/strict'
import test from 'node:test'

import { sanitizeLogText } from './safe-logger.ts'

test('remove URL de WhatsApp, IP e fingerprint integral', () => {
  const input = [
    'https://chat.whatsapp.com/SEGREDO123',
    '203.0.113.7',
    'a'.repeat(64),
  ].join(' ')

  const output = sanitizeLogText(input)
  assert.equal(output.includes('SEGREDO123'), false)
  assert.equal(output.includes('203.0.113.7'), false)
  assert.equal(output.includes('a'.repeat(64)), false)
})
