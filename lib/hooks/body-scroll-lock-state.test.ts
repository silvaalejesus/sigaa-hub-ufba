import assert from 'node:assert/strict'
import test from 'node:test'

import {
  acquireBodyScrollLock,
  createBodyScrollLockState,
  releaseBodyScrollLock,
} from './body-scroll-lock-state.ts'

test('dois overlays não liberam o body prematuramente', () => {
  const state = createBodyScrollLockState()
  assert.equal(acquireBodyScrollLock(state), true)
  assert.equal(acquireBodyScrollLock(state), false)
  assert.equal(releaseBodyScrollLock(state), false)
  assert.equal(releaseBodyScrollLock(state), true)
  assert.equal(state.activeLocks, 0)
})

test('cleanup repetido não gera contador negativo', () => {
  const state = createBodyScrollLockState()
  assert.equal(releaseBodyScrollLock(state), true)
  assert.equal(state.activeLocks, 0)
})
