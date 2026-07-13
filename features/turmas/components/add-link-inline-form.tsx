'use client'

import { useTransition } from 'react'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Loader2, PlusCircle, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as v from 'valibot'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adicionarLink } from '@/features/turmas/actions'

const WHATSAPP_INVITE_REGEX =
  /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+\/?$/

const addLinkSchema = v.object({
  url: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Informe o link do grupo.'),
    v.regex(
      WHATSAPP_INVITE_REGEX,
      'O link deve começar com https://chat.whatsapp.com/',
    ),
  ),
})

type AddLinkFormData = v.InferInput<typeof addLinkSchema>

interface AddLinkInlineFormProps {
  turmaId: string
  codigoTurma: string
  onCancel: () => void
  onSuccess: () => void
}

export function AddLinkInlineForm({
  turmaId,
  codigoTurma,
  onCancel,
  onSuccess,
}: AddLinkInlineFormProps) {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<AddLinkFormData>({
    resolver: valibotResolver(addLinkSchema),
    mode: 'onChange',
    defaultValues: {
      url: '',
    },
  })

  function onSubmit(data: AddLinkFormData) {
    startTransition(async () => {
      const result = await adicionarLink(turmaId, data.url)

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
      onSuccess()
    })
  }

  return (
    <form
      className="mt-4 rounded-2xl border bg-muted/30 p-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Adicionar link da turma {codigoTurma}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cole um link público iniciado por https://chat.whatsapp.com/.
          </p>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          disabled={isPending}
          onClick={onCancel}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-1.5">
          <label htmlFor={`whatsapp-url-${turmaId}`} className="sr-only">
            Link de convite do WhatsApp
          </label>

          <Input
            id={`whatsapp-url-${turmaId}`}
            type="url"
            inputMode="url"
            placeholder="https://chat.whatsapp.com/..."
            autoComplete="off"
            aria-invalid={Boolean(errors.url)}
            disabled={isPending}
            {...register('url')}
          />

          {errors.url?.message && (
            <p className="text-xs text-destructive">{errors.url.message}</p>
          )}

          {errors.root?.message && (
            <p className="text-xs text-destructive">{errors.root.message}</p>
          )}
        </div>

        <Button type="submit" disabled={!isValid || isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PlusCircle className="size-4" />
          )}
          Salvar link
        </Button>
      </div>
    </form>
  )
}
