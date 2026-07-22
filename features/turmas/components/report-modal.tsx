"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { Flag, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as v from "valibot";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { denunciarLink } from "@/features/turmas/actions";
import {
  DEACTIVATION_TOAST_DURATION_MS,
  REPORT_REASON_MAX_LENGTH,
  REPORT_REASON_MIN_LENGTH,
} from "@/features/turmas/constants";
import { formatCharacterCount } from "@/lib/forms/character-count";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

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
  contactReference: v.optional(v.string(), ""),
});
type ReportFormData = v.InferInput<typeof reportSchema>;

interface ReportModalProps {
  linkId: string;
  codigoTurma: string;
}

export function ReportModal({ linkId, codigoTurma }: ReportModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  useBodyScrollLock(open);

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
    mode: "onChange",
    defaultValues: { motivo: "", contactReference: "" },
  });
  const motivo = watch("motivo") ?? "";
  const counterId = `report-modal-counter-${linkId}`;

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
      clearErrors();
    }
  }

  function onSubmit(data: ReportFormData) {
    startTransition(async () => {
      const result = await denunciarLink(
        linkId,
        data.motivo,
        data.contactReference ?? "",
      );
      if (!result.ok) {
        setError("root", { type: "server", message: result.message });
        toast.error(result.message);
        return;
      }
      toast.success(result.message, {
        duration:
          result.status === "deactivated"
            ? DEACTIVATION_TOAST_DURATION_MS
            : undefined,
      });
      reset();
      clearErrors();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Flag className="size-4" />
          Denunciar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto overscroll-contain touch-pan-y">
        <DialogHeader>
          <DialogTitle>Denunciar link da turma {codigoTurma}</DialogTitle>
          <DialogDescription>
            Ajude a comunidade informando por que este link deve ser revisado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div
            aria-hidden="true"
            className="absolute -left-[10000px] h-px w-px overflow-hidden"
          >
            <label htmlFor={`contact-reference-modal-report-${linkId}`}>
              Não preencha este campo
            </label>
            <input
              id={`contact-reference-modal-report-${linkId}`}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register("contactReference")}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`report-modal-reason-${linkId}`}
              className="text-sm font-medium"
            >
              Motivo da denúncia
            </label>
            <Textarea
              id={`report-modal-reason-${linkId}`}
              rows={5}
              maxLength={REPORT_REASON_MAX_LENGTH}
              aria-describedby={counterId}
              aria-invalid={Boolean(errors.motivo || errors.root)}
              {...register("motivo")}
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                {errors.motivo?.message && (
                  <p className="text-sm text-destructive">
                    {errors.motivo.message}
                  </p>
                )}
                {errors.root?.message && (
                  <p className="text-sm text-destructive">
                    {errors.root.message}
                  </p>
                )}
              </div>
              <p
                id={counterId}
                className="shrink-0 text-xs text-muted-foreground"
              >
                {formatCharacterCount(motivo, REPORT_REASON_MAX_LENGTH)}
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
      </DialogContent>
    </Dialog>
  );
}
