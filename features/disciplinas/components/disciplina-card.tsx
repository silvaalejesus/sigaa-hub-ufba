"use client";

import {
  ExternalLink,
  Flag,
  MessageCircle,
  MessageCirclePlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReportLinkSuccess } from "@/features/turmas/action-results";
import { AddLinkInlineForm } from "@/features/turmas/components/add-link-inline-form";
import { ReportInlineForm } from "@/features/turmas/components/report-inline-form";
import { REPORTS_DEACTIVATION_THRESHOLD } from "@/features/turmas/constants";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import { cn } from "@/lib/utils";
import type { DisciplinaComTurmas } from "@/types/database";

interface DisciplinaCardProps {
  disciplina: DisciplinaComTurmas;
}

type LinkOverride = {
  reports: number;
  isActive: boolean;
};

export function DisciplinaCard({ disciplina }: DisciplinaCardProps) {
  const [open, setOpen] = useState(false);
  const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);
  const [reportingLinkId, setReportingLinkId] = useState<string | null>(null);
  const [linkOverrides, setLinkOverrides] = useState<
    Record<string, LinkOverride>
  >({});
  useBodyScrollLock(open);

  const totalTurmas = disciplina.turmas.length;
  const totalLinks = useMemo(
    () =>
      disciplina.turmas.reduce(
        (acc, turma) =>
          acc +
          turma.links.filter((link) => {
            const override = linkOverrides[link.id];
            return override?.isActive ?? link.is_active;
          }).length,
        0,
      ),
    [disciplina.turmas, linkOverrides],
  );

  function closeInlineForms() {
    setEditingTurmaId(null);
    setReportingLinkId(null);
  }

  function handleReportSuccess(linkId: string, result: ReportLinkSuccess) {
    setLinkOverrides((current) => ({
      ...current,
      [linkId]: {
        reports: result.reportsCount,
        isActive: result.isActive,
      },
    }));
    setReportingLinkId(null);
  }

  return (
    <>
      <article className="rounded-2xl border bg-card p-5 shadow-sm hover:border-primary/30 hover:bg-muted/20">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold tracking-wide text-emerald-700 dark:border-primary/20 dark:bg-primary/10 dark:text-primary">
            {disciplina.codigo}
          </span>
          {disciplina.departamento && (
            <span className="min-w-0 max-w-full whitespace-normal break-words rounded-2xl border px-3 py-1 text-wrap text-xs leading-normal text-muted-foreground [overflow-wrap:anywhere]">
              {disciplina.departamento}
            </span>
          )}
        </div>
        <h3 className="mt-3 text-lg font-semibold leading-tight">
          {disciplina.nome}
        </h3>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" aria-hidden="true" />
            {totalTurmas} {totalTurmas === 1 ? "turma" : "turmas"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="size-4" aria-hidden="true" />
            {totalLinks} {totalLinks === 1 ? "grupo" : "grupos"}
          </span>
        </div>
        <Button
          type="button"
          className="mt-5 w-full"
          onClick={() => {
            closeInlineForms();
            setOpen(true);
          }}
        >
          Ver Turmas
        </Button>
      </article>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) closeInlineForms();
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto overscroll-contain touch-pan-y">
          <DialogHeader>
            <DialogTitle>
              {disciplina.codigo} · {disciplina.nome}
            </DialogTitle>
            <DialogDescription>
              Veja as turmas disponíveis e acesse ou contribua com os links dos
              grupos.
            </DialogDescription>
          </DialogHeader>

          {disciplina.departamento && (
            <p className="text-xs font-medium text-primary">
              {disciplina.departamento}
            </p>
          )}

          <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
            Não existe grupo? Crie um no seu WhatsApp e cole o link de convite
            aqui.
          </p>

          <div className="space-y-3">
            {disciplina.turmas.map((turma) => {
              const activeLinks = turma.links.filter((candidate) => {
                const override = linkOverrides[candidate.id];
                return override?.isActive ?? candidate.is_active;
              });
              const link = activeLinks[0];
              const reportsCount = link
                ? Math.min(
                    Math.max(
                      0,
                      linkOverrides[link.id]?.reports ?? link.reports ?? 0,
                    ),
                    REPORTS_DEACTIVATION_THRESHOLD,
                  )
                : 0;
              const isEditingThisTurma = editingTurmaId === turma.id;
              const isReportingThisLink = reportingLinkId === link?.id;

              return (
                <section key={turma.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">Turma {turma.codigo_turma}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {turma.professor ?? "Docente não informado"}
                      </p>
                      {link && (
                        <p
                          className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                          aria-label={`Este link possui ${reportsCount} de ${REPORTS_DEACTIVATION_THRESHOLD} denúncias`}
                        >
                          <Flag className="size-3.5" aria-hidden="true" />
                          {reportsCount} de {REPORTS_DEACTIVATION_THRESHOLD}{" "}
                          denúncias
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {link ? (
                        <>
                          <a
                            href={link.url_whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ size: "sm" }))}
                          >
                            <ExternalLink
                              className="size-4"
                              aria-hidden="true"
                            />
                            Entrar no Grupo
                          </a>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingTurmaId(null);
                              setReportingLinkId(
                                isReportingThisLink ? null : link.id,
                              );
                            }}
                          >
                            <Flag className="size-4" aria-hidden="true" />
                            Denunciar
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReportingLinkId(null);
                            setEditingTurmaId(
                              isEditingThisTurma ? null : turma.id,
                            );
                          }}
                        >
                          <MessageCirclePlus
                            className="size-4"
                            aria-hidden="true"
                          />
                          Adicionar Link
                        </Button>
                      )}
                    </div>
                  </div>

                  {!link && isEditingThisTurma && (
                    <AddLinkInlineForm
                      turmaId={turma.id}
                      codigoTurma={turma.codigo_turma}
                      onCancel={() => setEditingTurmaId(null)}
                      onSuccess={() => setEditingTurmaId(null)}
                    />
                  )}

                  {link && isReportingThisLink && (
                    <ReportInlineForm
                      linkId={link.id}
                      codigoTurma={turma.codigo_turma}
                      initialReportsCount={reportsCount}
                      onCancel={() => setReportingLinkId(null)}
                      onSuccess={(result) =>
                        handleReportSuccess(link.id, result)
                      }
                    />
                  )}
                </section>
              );
            })}

            {totalTurmas === 0 && (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhuma turma disponível para esta disciplina no semestre
                vigente.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
