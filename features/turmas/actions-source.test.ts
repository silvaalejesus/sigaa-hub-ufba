import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Server Actions usam somente as RPCs seguras', async () => {
  const source = await readFile('features/turmas/actions.ts', 'utf8')

  assert.match(source, /rpc\('add_link_secure'/)
  assert.match(source, /rpc\('report_link_secure'/)
  assert.doesNotMatch(source, /incrementar_reports_link/)
  assert.doesNotMatch(source, /from\(['"]links['"]\)\s*\.insert/)
})
