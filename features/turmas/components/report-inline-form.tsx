'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { Flag, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as v from 'valibot'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ReportLinkSuccess } from '@/features/turmas/action-results'
import { denunciarLink } from '@/features/turmas/actions'
import {
  DEACTIVATION_TOAST_DURATION_MS,
  REPORT_REASON_MAX_LENGTH,
  REPORT_REASON_MIN_LENGTH,
} from '@/features/turmas/constants'
import { formatCharacterCount } from '@/lib/forms/character-count'

const reportSchema = v.object({
  motivo: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(
      REPORT_REASON_MIN_LENGTH,
      `Explique o motivo com pelo menos ${REPORT_REASON_MIN_LENGTH} caracteres.`,
    ),
    v.maxLength(
      REPORT_REASON_MAX_LENGTH,
      `O motivo deve ter no máximo ${REPORT_REASON_MAX_LENGTH} caracteres.`,
    ),
  ),
  contactReference: v.optional(v.string(), ''),
})

type ReportFormData = v.InferInput<typeof reportSchema>

interface ReportInlineFormProps {
  linkId: string
  codigoTurma: string
  initialReportsCount: number
  onCancel: () => void
  onSuccess: (result: ReportLinkSuccess) => void
}

export function ReportInlineForm({
  linkId,
  codigoTurma,
  initialReportsCount,
  onCancel,
  onSuccess,
}: ReportInlineFormProps) {
  const router = useRouter()
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
  const counterId = `report-reason-counter-${linkId}`
  const errorId = `report-reason-error-${linkId}`

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

      toast.success(result.message, {
        duration:
          result.status === 'deactivated'
            ? DEACTIVATION_TOAST_DURATION_MS
            : undefined,
      })
      reset()
      onSuccess(result)
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            Denunciar link da turma {codigoTurma}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Informe se o link está expirado, incorreto, suspeito ou não corresponde à turma.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Contagem atual: {initialReportsCount} de 3 denúncias.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel}>
          <X className="size-4" />
          <span className="sr-only">Cancelar denúncia</span>
        </Button>
      </div>

      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
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

      <div className="mt-3 space-y-2">
        <label htmlFor={`report-reason-${linkId}`} className="text-xs font-medium">
          Motivo da denúncia
        </label>
        <Textarea
          id={`report-reason-${linkId}`}
          rows={4}
          maxLength={REPORT_REASON_MAX_LENGTH}
          aria-invalid={Boolean(errors.motivo || errors.root)}
          aria-describedby={`${counterId} ${errorId}`}
          {...register('motivo')}
        />
        <div className="flex items-start justify-between gap-3">
          <div id={errorId}>
            {errors.motivo?.message && (
              <p className="text-xs text-destructive">{errors.motivo.message}</p>
            )}
            {errors.root?.message && (
              <p className="text-xs text-destructive">{errors.root.message}</p>
            )}
          </div>
          <p id={counterId} className="shrink-0 text-xs text-muted-foreground">
            {formatCharacterCount(motivo, REPORT_REASON_MAX_LENGTH)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          type="submit"
          variant="destructive"
          disabled={!isValid || isPending}
        >
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
