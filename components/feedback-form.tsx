'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import * as Sentry from '@sentry/nextjs'
import { Loader2, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as v from 'valibot'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FEEDBACK_EMAIL_MAX_LENGTH,
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_NAME_MAX_LENGTH,
  NETLIFY_FEEDBACK_ENDPOINT,
} from '@/features/feedback/constants'
import { serializeFeedbackForm } from '@/features/feedback/netlify'
import {
  feedbackSchema,
  type FeedbackFormData,
} from '@/features/feedback/schema'
import { formatCharacterCount } from '@/lib/forms/character-count'

const SUCCESS_MESSAGE = 'Obrigada! Sua sugestão foi enviada com sucesso.'
const FAILURE_MESSAGE = 'Não foi possível enviar sua sugestão. Tente novamente.'

function captureNetlifyFormsFailure(kind: string): void {
  Sentry.withScope((scope) => {
    scope.setTag('operation', 'feedback.netlify-forms')
    scope.setTag('failure_kind', kind)
    Sentry.captureException(new Error('Unexpected Netlify Forms submission failure'))
  })
}

export function FeedbackForm() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FeedbackFormData>({
    resolver: valibotResolver(feedbackSchema),
    mode: 'onChange',
    defaultValues: {
      nome: '',
      email: '',
      descricao: '',
      contact_company: '',
    },
  })

  const descricao = watch('descricao') ?? ''
  const counterId = 'feedback-description-counter'
  const errorId = 'feedback-description-error'

  async function onSubmit(data: FeedbackFormData) {
    const parsed = v.safeParse(feedbackSchema, data)
    if (!parsed.success) {
      const message = parsed.issues[0]?.message ?? 'Dados inválidos.'
      setError('root', { type: 'validation', message })
      toast.error(message)
      return
    }

    try {
      const response = await fetch(NETLIFY_FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: serializeFeedbackForm(parsed.output).toString(),
      })

      if (!response.ok) {
        if (response.status >= 500) captureNetlifyFormsFailure('server-response')
        setError('root', { type: 'server', message: FAILURE_MESSAGE })
        toast.error(FAILURE_MESSAGE)
        return
      }

      toast.success(SUCCESS_MESSAGE)
      reset()
    } catch {
      captureNetlifyFormsFailure('network-or-runtime')
      setError('root', { type: 'server', message: FAILURE_MESSAGE })
      toast.error(FAILURE_MESSAGE)
    }
  }

  return (
    <form
      name="sigaa-hub-feedback"
      method="POST"
      action={NETLIFY_FEEDBACK_ENDPOINT}
      data-netlify="true"
      data-netlify-honeypot="contact_company"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <input type="hidden" name="form-name" value="sigaa-hub-feedback" />

      <div
        aria-hidden="true"
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
      >
        <label htmlFor="contact-company">Não preencha este campo</label>
        <input
          id="contact-company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register('contact_company')}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="feedback-name" className="text-sm font-medium">
          Nome
        </label>
        <Input
          id="feedback-name"
          maxLength={FEEDBACK_NAME_MAX_LENGTH}
          autoComplete="name"
          aria-invalid={Boolean(errors.nome)}
          {...register('nome')}
        />
        {errors.nome?.message && (
          <p className="text-xs text-destructive">{errors.nome.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="feedback-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="feedback-email"
          type="email"
          maxLength={FEEDBACK_EMAIL_MAX_LENGTH}
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email?.message && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="feedback-description" className="text-sm font-medium">
          Feedback ou sugestão
        </label>
        <Textarea
          id="feedback-description"
          rows={5}
          maxLength={FEEDBACK_MAX_LENGTH}
          aria-invalid={Boolean(errors.descricao || errors.root)}
          aria-describedby={`${counterId} ${errorId}`}
          {...register('descricao')}
        />
        <div className="flex items-start justify-between gap-3">
          <div id={errorId}>
            {errors.descricao?.message && (
              <p className="text-xs text-destructive">
                {errors.descricao.message}
              </p>
            )}
            {errors.root?.message && (
              <p className="text-xs text-destructive">{errors.root.message}</p>
            )}
          </div>
          <p id={counterId} className="shrink-0 text-xs text-muted-foreground">
            {formatCharacterCount(descricao, FEEDBACK_MAX_LENGTH)}
          </p>
        </div>
      </div>

      <Button type="submit" disabled={!isValid || isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Enviar sugestão
      </Button>
    </form>
  )
}
