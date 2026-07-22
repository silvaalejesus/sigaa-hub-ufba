import assert from 'node:assert/strict'
import test from 'node:test'

import { formatCharacterCount } from './character-count.ts'

test('formata digitados/máximo', () => {
  assert.equal(formatCharacterCount('', 150), '0/150 caracteres')
  assert.equal(formatCharacterCount('abc', 150), '3/150 caracteres')
  assert.equal(formatCharacterCount('x'.repeat(150), 150), '150/150 caracteres')
})

test('não produz contagem visual acima do máximo', () => {
  assert.equal(formatCharacterCount('x'.repeat(201), 200), '200/200 caracteres')
})
