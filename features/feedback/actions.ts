'use server'

import * as v from 'valibot'

const feedbackSchema = v.object({
  nome: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(2, 'Informe seu nome.'),
    v.maxLength(80, 'O nome deve ter no máximo 80 caracteres.'),
  ),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.email('Informe um email válido.'),
    v.maxLength(120, 'O email deve ter no máximo 120 caracteres.'),
  ),
  descricao: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(10, 'Descreva sua sugestão com pelo menos 10 caracteres.'),
    v.maxLength(200, 'A descrição deve ter no máximo 200 caracteres.'),
  ),
})

export type FeedbackActionResult =
  | {
      ok: true
      message: string
    }
  | {
      ok: false
      message: string
    }

export async function enviarFeedback(input: {
  nome: string
  email: string
  descricao: string
}): Promise<FeedbackActionResult> {
  const parsed = v.safeParse(feedbackSchema, input)

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.issues[0]?.message ?? 'Dados inválidos.',
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 700))

  console.log('[SIGAA Hub] Feedback recebido:', {
    ...parsed.output,
    receivedAt: new Date().toISOString(),
  })

  return {
    ok: true,
    message: 'Obrigada! Sua sugestão foi enviada com sucesso.',
  }
}
