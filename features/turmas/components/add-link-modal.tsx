'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { Loader2, PlusCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
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
import { Input } from '@/components/ui/input'
import { adicionarLink } from '@/features/turmas/actions'
import { useBodyScrollLock } from '@/lib/hooks/use-body-scroll-lock'

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

interface AddLinkModalProps {
  turmaId: string
  codigoTurma: string
}

export function AddLinkModal({ turmaId, codigoTurma }: AddLinkModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  useBodyScrollLock(open)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isValid },
  } = useForm<AddLinkFormData>({
    resolver: valibotResolver(addLinkSchema),
    mode: 'onChange',
    defaultValues: { url: '', contactReference: '' },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return
    setOpen(nextOpen)
    if (!nextOpen) {
      reset()
      clearErrors()
    }
  }

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
      clearErrors()
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog modal open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <PlusCircle className="size-4" />
        Adicionar Link
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto overscroll-contain touch-pan-y">
        <DialogHeader>
          <DialogTitle>Adicionar grupo da turma {codigoTurma}</DialogTitle>
          <DialogDescription>
            Cole o link público do grupo do WhatsApp. O link precisa começar com
            https://chat.whatsapp.com/.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
            <label htmlFor={`contact-reference-modal-add-${turmaId}`}>
              Não preencha este campo
            </label>
            <input
              id={`contact-reference-modal-add-${turmaId}`}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register('contactReference')}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={`modal-whatsapp-url-${turmaId}`} className="text-sm font-medium">
              Link de convite
            </label>
            <Input
              id={`modal-whatsapp-url-${turmaId}`}
              type="url"
              maxLength={200}
              aria-invalid={Boolean(errors.url)}
              {...register('url')}
            />
            {errors.url?.message && <p className="text-sm text-destructive">{errors.url.message}</p>}
            {errors.root?.message && <p className="text-sm text-destructive">{errors.root.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={isPending} onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Salvar link
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
