'use client'

import { useState, useTransition } from 'react'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Flag, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as v from 'valibot'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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

interface ReportModalProps {
  linkId: string
  codigoTurma: string
}

export function ReportModal({ linkId, codigoTurma }: ReportModalProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
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

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return
    setOpen(nextOpen)
    if (!nextOpen) {
      reset()
      clearErrors()
    }
  }

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
      clearErrors()
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Flag className="size-4" />
          Denunciar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Denunciar link da turma {codigoTurma}</DialogTitle>
          <DialogDescription>
            Ajude a comunidade informando por que este link deve ser revisado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-4">
          <div
            aria-hidden="true"
            className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
          >
            <label htmlFor={`contact-reference-report-modal-${linkId}`}>
              Não preencha este campo
            </label>
            <input
              id={`contact-reference-report-modal-${linkId}`}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register('contactReference')}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={`report-reason-modal-${linkId}`} className="text-sm font-medium">
              Motivo da denúncia
            </label>
            <Textarea
              id={`report-reason-modal-${linkId}`}
              maxLength={150}
              disabled={isPending}
              {...register('motivo')}
            />
            <div className="flex items-center justify-between gap-3">
              <div>
                {errors.motivo?.message && (
                  <p className="text-sm text-destructive">{errors.motivo.message}</p>
                )}
                {errors.root?.message && (
                  <p className="text-sm text-destructive">{errors.root.message}</p>
                )}
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {remaining} caracteres
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={!isValid || isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Enviar denúncia
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
