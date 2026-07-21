'use client'

import { useTransition } from 'react'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Flag, Loader2, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as v from 'valibot'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { denunciarLink } from '@/features/turmas/actions'

const reportSchema = v.object({
  motivo: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(10, 'Explique o motivo com pelo menos 10 caracteres.'),
    v.maxLength(150, 'O motivo deve ter no máximo 150 caracteres.'),
  ),
  contactReference: v.optional(v.string(), ''),
})

type ReportFormData = v.InferInput<typeof reportSchema>

interface ReportInlineFormProps {
  linkId: string
  codigoTurma: string
  onCancel: () => void
  onSuccess: () => void
}

export function ReportInlineForm({
  linkId,
  codigoTurma,
  onCancel,
  onSuccess,
}: ReportInlineFormProps) {
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isValid },
  } = useForm<ReportFormData>({
    resolver: valibotResolver(reportSchema),
    mode: 'onChange',
    defaultValues: { motivo: '', contactReference: '' },
  })

  const motivo = watch('motivo') ?? ''
  const remaining = 150 - motivo.length

  function onSubmit(data: ReportFormData) {
    startTransition(async () => {
      const result = await denunciarLink(
        linkId,
        data.motivo,
        data.contactReference ?? '',
      )

      if (!result.ok) {
        setError('root', { type: 'server', message: result.message })
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      reset()
      onSuccess()
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="relative rounded-lg border border-destructive/30 bg-destructive/5 p-4"
    >
      <div
        aria-hidden="true"
        className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
      >
        <label htmlFor={`contact-reference-report-${linkId}`}>
          Não preencha este campo
        </label>
        <input
          id={`contact-reference-report-${linkId}`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register('contactReference')}
        />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">Denunciar link da turma {codigoTurma}</p>
          <p className="text-sm text-muted-foreground">
            Informe se o link está expirado, incorreto, suspeito ou não corresponde à turma.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isPending}
          onClick={onCancel}
          aria-label="Cancelar denúncia"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        <label htmlFor={`report-reason-${linkId}`} className="text-sm font-medium">
          Motivo da denúncia
        </label>
        <Textarea
          id={`report-reason-${linkId}`}
          maxLength={150}
          disabled={isPending}
          {...register('motivo')}
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            {errors.motivo?.message && (
              <p className="text-xs text-destructive">{errors.motivo.message}</p>
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

      <div className="mt-3 flex justify-end">
        <Button type="submit" variant="destructive" disabled={!isValid || isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Flag className="size-4" />
          )}
          Enviar denúncia
        </Button>
      </div>
    </form>
  )
}
