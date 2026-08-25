"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { Loader2, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as v from "valibot";

import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { adicionarLink } from "@/features/turmas/actions";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

const WHATSAPP_INVITE_REGEX =
  /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+\/?$/;
const addLinkSchema = v.object({
  nome: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Informe seu nome."),
    v.minLength(3, "Informe um nome com pelo menos 3 caracteres."),
    v.maxLength(100, "O nome deve ter no máximo 100 caracteres."),
  ),
  matricula: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Informe seu número de matrícula."),
    v.regex(/^\d{5,20}$/, "Informe uma matrícula contendo apenas números."),
  ),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Informe seu e-mail."),
    v.maxLength(254, "O e-mail deve ter no máximo 254 caracteres."),
    v.email("Informe um e-mail válido."),
  ),
  url: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Informe o link do grupo."),
    v.regex(
      WHATSAPP_INVITE_REGEX,
      "O link deve começar com https://chat.whatsapp.com/",
    ),
  ),
  contactReference: v.optional(v.string(), ""),
});

type AddLinkFormData = v.InferInput<typeof addLinkSchema>;

interface AddLinkModalProps {
  turmaId: string;
  codigoTurma: string;
}

export function AddLinkModal({ turmaId, codigoTurma }: AddLinkModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  useBodyScrollLock(open);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isValid },
  } = useForm<AddLinkFormData>({
    resolver: valibotResolver(addLinkSchema),
    mode: "onChange",
    defaultValues: {
      nome: "",
      matricula: "",
      email: "",
      url: "",
      contactReference: "",
    },
  });

  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetNonce, setTurnstileResetNonce] = useState(0);

  function resetTurnstile() {
    setTurnstileToken("");
    setTurnstileResetNonce((v) => v + 1);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
      clearErrors();
    }
  }

  function onSubmit(data: AddLinkFormData) {
    if (!turnstileToken) {
      setError("root", {
        type: "server",
        message: "Conclua a verificação antirobô.",
      });
      return;
    }

    startTransition(async () => {
      const result = await adicionarLink(
        turmaId,
        data.url,
        data.nome,
        data.matricula,
        data.email,
        turnstileToken,
        data.contactReference ?? "",
      );

      resetTurnstile();

      if (!result.ok) {
        setError("root", { type: "server", message: result.message });
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      reset();
      clearErrors();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusCircle className="size-4" />
          Adicionar Link
        </Button>
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
          <div
            aria-hidden="true"
            className="absolute -left-[10000px] h-px w-px overflow-hidden"
          >
            <label htmlFor={`contact-reference-modal-add-${turmaId}`}>
              Não preencha este campo
            </label>
            <input
              id={`contact-reference-modal-add-${turmaId}`}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register("contactReference")}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor={`submitter-name-modal-${turmaId}`}
                className="text-sm font-medium"
              >
                Nome completo
              </label>
              <Input
                id={`submitter-name-modal-${turmaId}`}
                type="text"
                autoComplete="name"
                maxLength={100}
                aria-invalid={Boolean(errors.nome)}
                {...register("nome")}
              />
              {errors.nome?.message && (
                <p className="text-sm text-destructive">
                  {errors.nome.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`submitter-registration-modal-${turmaId}`}
                className="text-sm font-medium"
              >
                Matrícula UFBA
              </label>
              <Input
                id={`submitter-registration-modal-${turmaId}`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={20}
                aria-invalid={Boolean(errors.matricula)}
                {...register("matricula")}
              />
              {errors.matricula?.message && (
                <p className="text-sm text-destructive">
                  {errors.matricula.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`submitter-email-modal-${turmaId}`}
                className="text-sm font-medium"
              >
                E-mail
              </label>
              <Input
                id={`submitter-email-modal-${turmaId}`}
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email?.message && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`modal-whatsapp-url-${turmaId}`}
                className="text-sm font-medium"
              >
                Link de convite
              </label>
              <Input
                id={`modal-whatsapp-url-${turmaId}`}
                type="url"
                maxLength={200}
                aria-invalid={Boolean(errors.url)}
                {...register("url")}
              />
              {errors.url?.message && (
                <p className="text-sm text-destructive">{errors.url.message}</p>
              )}
            </div>

            {errors.root?.message && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}
          </div>

          <div className="mt-3">
            <p className="text-xs text-muted-foreground">
              Nome, matrícula e e-mail são armazenados de forma privada para
              moderação e contato administrativo. O grupo só será publicado
              depois que você confirmar o e-mail informado.
            </p>
          </div>

          <div className="mt-3">
            <TurnstileWidget
              onTokenChange={setTurnstileToken}
              resetNonce={turnstileResetNonce}
            />
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
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Salvar link
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
