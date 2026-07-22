import {
  NETLIFY_FEEDBACK_FORM_NAME,
  NETLIFY_FEEDBACK_HONEYPOT,
} from './constants.ts'

export type NetlifyFeedbackPayload = {
  nome: string
  email: string
  descricao: string
  contact_company?: string
}

export function serializeFeedbackForm(
  data: NetlifyFeedbackPayload,
): URLSearchParams {
  return new URLSearchParams({
    'form-name': NETLIFY_FEEDBACK_FORM_NAME,
    nome: data.nome.trim(),
    email: data.email.trim(),
    descricao: data.descricao.trim(),
    [NETLIFY_FEEDBACK_HONEYPOT]: data.contact_company ?? '',
  })
}
