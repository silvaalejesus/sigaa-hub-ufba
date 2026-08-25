'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { Loader2, PlusCircle, X } from 'lucide-react'
import Link from 'next/link'
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
  // sigaa-hub-private-link-submitter-v1
  nome: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Informe seu nome.'),
    v.minLength(3, 'Informe um nome com pelo menos 3 caracteres.'),
    v.maxLength(100, 'O nome deve ter no máximo 100 caracteres.'),
  ),
  matricula: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Informe seu número de matrícula.'),
    v.regex(/^\d{5,20}$/, 'Informe uma matrícula contendo apenas números.'),
  ),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Informe seu e-mail.'),
    v.maxLength(254, 'O e-mail deve ter no máximo 254 caracteres.'),
    v.email('Informe um e-mail válido.'),
  ),
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
    defaultValues: {
      nome: '',
      matricula: '',
      email: '',
      url: '',
      contactReference: '',
    },
  })

  function onSubmit(data: AddLinkFormData) {
    startTransition(async () => {
      const result = await adicionarLink(
        turmaId,
        data.url,
        data.nome,
        data.matricula,
        data.email,
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

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={`submitter-name-${turmaId}`} className="text-xs font-medium">
            Nome completo
          </label>
          <Input
            id={`submitter-name-${turmaId}`}
            type="text"
            autoComplete="name"
            maxLength={100}
            aria-invalid={Boolean(errors.nome)}
            {...register('nome')}
          />
          {errors.nome?.message && (
            <p className="text-xs text-destructive">{errors.nome.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`submitter-registration-${turmaId}`}
            className="text-xs font-medium"
          >
            Matrícula UFBA
          </label>
          <Input
            id={`submitter-registration-${turmaId}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
            aria-invalid={Boolean(errors.matricula)}
            {...register('matricula')}
          />
          {errors.matricula?.message && (
            <p className="text-xs text-destructive">{errors.matricula.message}</p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <label htmlFor={`submitter-email-${turmaId}`} className="text-xs font-medium">
          E-mail
        </label>
        <Input
          id={`submitter-email-${turmaId}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email?.message && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
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

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Nome, matrícula e e-mail são armazenados de forma privada para moderação
        e contato administrativo. Eles não aparecem na página da turma.{' '}
        <Link href="/privacidade" className="underline underline-offset-2 hover:text-foreground">
          Saiba como os dados são tratados
        </Link>
        .
      </p>

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
