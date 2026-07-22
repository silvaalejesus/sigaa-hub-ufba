import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapAddRpcResult,
  mapReportRpcResult,
  parseReportRpcRow,
} from './action-results.ts'

test('mapeia URL histórica separadamente de link ativo', () => {
  assert.equal(mapAddRpcResult('active_link_exists').ok, false)
  assert.equal(mapAddRpcResult('url_already_registered').ok, false)
  assert.match(
    mapAddRpcResult('url_already_registered').message,
    /cadastrado anteriormente/,
  )
})

test('usa a contagem real retornada pela RPC', () => {
  const first = mapReportRpcResult({
    result_status: 'reported',
    reports_count: 1,
    is_active: true,
  })
  const second = mapReportRpcResult({
    result_status: 'reported',
    reports_count: 2,
    is_active: true,
  })
  const third = mapReportRpcResult({
    result_status: 'deactivated',
    reports_count: 3,
    is_active: false,
  })

  assert.equal(first.ok && first.reportsCount, 1)
  assert.equal(second.ok && second.reportsCount, 2)
  assert.equal(third.ok && third.reportsCount, 3)
  assert.equal(third.ok && third.isActive, false)
  assert.match(third.message, /passará por análise/)
})

test('rejeita resposta estruturalmente inválida', () => {
  assert.equal(parseReportRpcRow({ result_status: 'reported' }), null)
  assert.equal(mapReportRpcResult(null).ok, false)
})
