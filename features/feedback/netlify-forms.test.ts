import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { serializeFeedbackForm } from './netlify.ts'

test('serializa todos os nomes esperados pelo Netlify Forms', () => {
  const body = serializeFeedbackForm({
    nome: 'Pessoa Teste',
    email: 'teste@example.invalid',
    descricao: 'Sugestão válida para teste.',
    contact_company: '',
  })

  assert.equal(body.get('form-name'), 'sigaa-hub-feedback')
  assert.equal(body.get('nome'), 'Pessoa Teste')
  assert.equal(body.get('email'), 'teste@example.invalid')
  assert.equal(body.get('descricao'), 'Sugestão válida para teste.')
  assert.equal(body.get('contact_company'), '')
})

test('arquivo estático contém formulário detectável', async () => {
  const html = await readFile('public/__forms.html', 'utf8')
  assert.match(html, /name="sigaa-hub-feedback"/)
  assert.match(html, /data-netlify="true"/)
  assert.match(html, /data-netlify-honeypot="contact_company"/)
  assert.match(html, /name="form-name" value="sigaa-hub-feedback"/)
})
