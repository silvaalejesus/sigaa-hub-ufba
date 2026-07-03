"use client";

import {
  ExternalLink,
  Flag,
  Loader2,
  MessageCircle,
  Users,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { denunciarLink } from "@/features/turmas/actions";
import { AddLinkModal } from "@/features/turmas/components/add-link-modal";

interface Link {
  id: string;
  turma_id: string;
  url_whatsapp: string;
  reports: number;
  is_active: boolean;
  created_at: string;
}

interface Turma {
  id: string;
  disciplina_id: string;
  codigo_turma: string;
  professor: string | null;
  semestre: string;
  created_at: string;
  links: Link[];
}

interface Disciplina {
  id: string;
  codigo: string;
  nome: string;
  departamento: string | null;
  created_at: string;
  turmas: Turma[];
}

interface DisciplinaCardProps {
  disciplina: Disciplina;
}

export function DisciplinaCard({ disciplina }: DisciplinaCardProps) {
  const [pendingLinkId, setPendingLinkId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalTurmas = disciplina.turmas.length;
  const totalLinks = disciplina.turmas.reduce(
    (acc, turma) => acc + turma.links.length,
    0,
  );

  function handleDenunciarLink(linkId: string) {
    setPendingLinkId(linkId);

    startTransition(async () => {
      const result = await denunciarLink(linkId);

      if (!result.ok) {
        toast.error(result.message);
        setPendingLinkId(null);
        return;
      }

      toast.success(result.message);
      setPendingLinkId(null);
    });
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={disciplina.id}
        className="overflow-hidden rounded-2xl border bg-card px-5 shadow-sm transition-colors hover:bg-muted/20"
      >
        <AccordionTrigger className="py-5 text-left hover:no-underline">
          <div className="flex w-full flex-col gap-3 pr-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                  {disciplina.codigo}
                </span>

                {disciplina.departamento && (
                  <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                    {disciplina.departamento}
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold leading-tight">
                {disciplina.nome}
              </h3>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="size-4" />
                {totalTurmas} {totalTurmas === 1 ? "turma" : "turmas"}
              </span>

              <span className="inline-flex items-center gap-1">
                <MessageCircle className="size-4" />
                {totalLinks} {totalLinks === 1 ? "grupo" : "grupos"}
              </span>
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="pb-5">
          <div className="mb-4 rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Não existe grupo? Crie um no seu WhatsApp e cole o link de convite
            aqui.
          </div>

          <div className="space-y-3">
            {disciplina.turmas.map((turma) => {
              const activeLinks = turma.links.filter((link) => link.is_active);
              const link = activeLinks[0];
              const isReportingThisLink =
                isPending && pendingLinkId === link?.id;

              return (
                <div
                  key={turma.id}
                  className="flex flex-col gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold">
                      Turma {turma.codigo_turma}
                    </p>

                    <p className="truncate text-sm text-muted-foreground">
                      {turma.professor ?? "Docente não informado"}
                    </p>
                  </div>

                  {link ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        asChild
                        size="sm"
                        className="bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
                      >
                        <a
                          href={link.url_whatsapp}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Entrar no Grupo
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Denunciar link"
                        aria-label={`Denunciar link da turma ${turma.codigo_turma}`}
                        className="size-8 text-muted-foreground hover:text-destructive"
                        disabled={isReportingThisLink}
                        onClick={() => handleDenunciarLink(link.id)}
                      >
                        {isReportingThisLink ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Flag className="size-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <AddLinkModal
                      turmaId={turma.id}
                      codigoTurma={turma.codigo_turma}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
