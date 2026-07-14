"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { Flag, Loader2, X } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as v from "valibot";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { denunciarLink } from "@/features/turmas/actions";

const reportSchema = v.object({
  motivo: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(10, "Explique o motivo com pelo menos 10 caracteres."),
    v.maxLength(150, "O motivo deve ter no máximo 150 caracteres."),
  ),
});

type ReportFormData = v.InferInput<typeof reportSchema>;

interface ReportInlineFormProps {
  linkId: string;
  codigoTurma: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ReportInlineForm({
  linkId,
  codigoTurma,
  onCancel,
  onSuccess,
}: ReportInlineFormProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isValid },
  } = useForm<ReportFormData>({
    resolver: valibotResolver(reportSchema),
    mode: "onChange",
    defaultValues: {
      motivo: "",
    },
  });

  const motivo = watch("motivo") ?? "";
  const remaining = 150 - motivo.length;

  function onSubmit(data: ReportFormData) {
    startTransition(async () => {
      const result = await denunciarLink(linkId, data.motivo);

      if (!result.ok) {
        setError("root", {
          type: "server",
          message: result.message,
        });

        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      reset();
      onSuccess();
    });
  }

  return (
    <form
      className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            Denunciar link da turma {codigoTurma}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Informe se o link está expirado, incorreto, suspeito ou não
            corresponde à turma.
          </p>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label="Cancelar denúncia"
          disabled={isPending}
          onClick={onCancel}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Ex: link expirado, turma incorreta, spam..."
          maxLength={150}
          disabled={isPending}
          aria-invalid={Boolean(errors.motivo)}
          {...register("motivo")}
        />

        <div className="flex items-start justify-between gap-3">
          <div>
            {errors.motivo?.message && (
              <p className="text-xs text-destructive">
                {errors.motivo.message}
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

      {/* <div className="mt-3 flex items-start gap-2 rounded-xl border bg-background/70 p-3 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />

        <p>
          Para prevenir abuso, registramos o motivo, data e hora, país
          aproximado e um identificador técnico pseudonimizado. O endereço IP
          bruto não é salvo.
        </p>
      </div> */}

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
  );
}
