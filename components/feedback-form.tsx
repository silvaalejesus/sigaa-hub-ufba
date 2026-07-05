'use client'

import { useTransition } from 'react'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Loader2, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as v from 'valibot'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { enviarFeedback } from '@/features/feedback/actions'

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

type FeedbackFormData = v.InferInput<typeof feedbackSchema>

export function FeedbackForm() {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isValid },
  } = useForm<FeedbackFormData>({
    resolver: valibotResolver(feedbackSchema),
    mode: 'onChange',
    defaultValues: {
      nome: '',
      email: '',
      descricao: '',
    },
  })

  const descricao = watch('descricao') ?? ''
  const remaining = 200 - descricao.length

  function onSubmit(data: FeedbackFormData) {
    startTransition(async () => {
      const result = await enviarFeedback(data)

      if (!result.ok) {
        setError('root', {
          type: 'server',
          message: result.message,
        })

        toast.error(result.message)
        return
      }

      toast.success(result.message)
      reset()
    })
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="feedback-nome" className="text-sm font-medium">
            Nome
          </label>
          <Input
            id="feedback-nome"
            placeholder="Seu nome"
            disabled={isPending}
            aria-invalid={Boolean(errors.nome)}
            {...register('nome')}
          />
          {errors.nome?.message && (
            <p className="text-xs text-destructive">{errors.nome.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="feedback-email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="feedback-email"
            type="email"
            placeholder="voce@email.com"
            disabled={isPending}
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          {errors.email?.message && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="feedback-descricao" className="text-sm font-medium">
          Feedback ou sugestão
        </label>
        <Textarea
          id="feedback-descricao"
          placeholder="Conte como podemos melhorar o SIGAA Hub..."
          maxLength={200}
          disabled={isPending}
          aria-invalid={Boolean(errors.descricao)}
          {...register('descricao')}
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            {errors.descricao?.message && (
              <p className="text-xs text-destructive">
                {errors.descricao.message}
              </p>
            )}
            {errors.root?.message && (
              <p className="text-xs text-destructive">{errors.root.message}</p>
            )}
          </div>
          <p className="shrink-0 text-xs text-muted-foreground">
            {remaining} caracteres
          </p>
        </div>
      </div>

      <Button type="submit" disabled={!isValid || isPending}>
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Enviar sugestão
      </Button>
    </form>
  )
}
