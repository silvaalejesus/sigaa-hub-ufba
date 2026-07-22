import * as v from 'valibot'

import {
  FEEDBACK_EMAIL_MAX_LENGTH,
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_MIN_LENGTH,
  FEEDBACK_NAME_MAX_LENGTH,
  FEEDBACK_NAME_MIN_LENGTH,
  NETLIFY_FEEDBACK_FORM_NAME,
  NETLIFY_FEEDBACK_HONEYPOT,
} from './constants.ts'

export const feedbackSchema = v.object({
  nome: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(FEEDBACK_NAME_MIN_LENGTH, 'Informe seu nome.'),
    v.maxLength(
      FEEDBACK_NAME_MAX_LENGTH,
      `O nome deve ter no máximo ${FEEDBACK_NAME_MAX_LENGTH} caracteres.`,
    ),
  ),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.email('Informe um email válido.'),
    v.maxLength(
      FEEDBACK_EMAIL_MAX_LENGTH,
      `O email deve ter no máximo ${FEEDBACK_EMAIL_MAX_LENGTH} caracteres.`,
    ),
  ),
  descricao: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(
      FEEDBACK_MIN_LENGTH,
      `Descreva sua sugestão com pelo menos ${FEEDBACK_MIN_LENGTH} caracteres.`,
    ),
    v.maxLength(
      FEEDBACK_MAX_LENGTH,
      `A descrição deve ter no máximo ${FEEDBACK_MAX_LENGTH} caracteres.`,
    ),
  ),
  contact_company: v.optional(v.string(), ''),
})

export type FeedbackFormData = v.InferInput<typeof feedbackSchema>
