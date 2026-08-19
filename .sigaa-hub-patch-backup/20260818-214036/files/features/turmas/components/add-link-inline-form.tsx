'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { Loader2, PlusCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
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
  contactReference: v.optional(v.string(), ''),
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
  const router = useRouter()
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
    defaultValues: { url: '', contactReference: '' },
  })

  function onSubmit(data: AddLinkFormData) {
    startTransition(async () => {
      const result = await adicionarLink(
        turmaId,
        data.url,
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
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-4 rounded-xl border bg-muted/30 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Adicionar link da turma {codigoTurma}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cole um link público iniciado por https://chat.whatsapp.com/.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel}>
          <X className="size-4" />
          <span className="sr-only">Cancelar cadastro</span>
        </Button>
      </div>

      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor={`contact-reference-add-${turmaId}`}>
          Não preencha este campo
        </label>
        <input
          id={`contact-reference-add-${turmaId}`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register('contactReference')}
        />
      </div>

      <div className="mt-3 space-y-2">
        <label htmlFor={`whatsapp-url-${turmaId}`} className="text-xs font-medium">
          Link de convite do WhatsApp
        </label>
        <Input
          id={`whatsapp-url-${turmaId}`}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://chat.whatsapp.com/..."
          aria-invalid={Boolean(errors.url)}
          {...register('url')}
        />
        {errors.url?.message && (
          <p className="text-xs text-destructive">{errors.url.message}</p>
        )}
        {errors.root?.message && (
          <p className="text-xs text-destructive">{errors.root.message}</p>
        )}
      </div>

      <div className="mt-3 flex justify-end">
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
