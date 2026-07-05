'use client'

import { useState } from 'react'
import {
  ExternalLink,
  MessageCircle,
  Users,
} from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { AddLinkModal } from '@/features/turmas/components/add-link-modal'
import { ReportModal } from '@/features/turmas/components/report-modal'
import type { DisciplinaComTurmas } from '@/types/database'

interface DisciplinaCardProps {
  disciplina: DisciplinaComTurmas
}

export function DisciplinaCard({ disciplina }: DisciplinaCardProps) {
  const [open, setOpen] = useState(false)

  const totalTurmas = disciplina.turmas.length
  const totalLinks = disciplina.turmas.reduce(
    (acc, turma) =>
      acc + turma.links.filter((link) => link.is_active !== false).length,
    0,
  )

  return (
    <>
      <article className="flex h-full flex-col justify-between rounded-3xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/20">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold tracking-wide text-primary">
              {disciplina.codigo}
            </span>

            {disciplina.departamento && (
              <span className="line-clamp-1 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                {disciplina.departamento}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="line-clamp-2 text-lg font-semibold leading-tight">
              {disciplina.nome}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="size-4" />
                {totalTurmas} {totalTurmas === 1 ? 'turma' : 'turmas'}
              </span>

              <span className="inline-flex items-center gap-1">
                <MessageCircle className="size-4" />
                {totalLinks} {totalLinks === 1 ? 'grupo' : 'grupos'}
              </span>
            </div>
          </div>
        </div>

        <Button type="button" className="mt-5 w-full" onClick={() => setOpen(true)}>
          Ver Turmas
        </Button>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {disciplina.codigo} · {disciplina.nome}
            </DialogTitle>
            <DialogDescription>
              Veja as turmas disponíveis e acesse ou contribua com os links dos
              grupos.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Não existe grupo? Crie um no seu WhatsApp e cole o link de convite
            aqui.
          </div>

          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            {disciplina.turmas.map((turma) => {
              const activeLinks = turma.links.filter(
                (link) => link.is_active !== false,
              )
              const link = activeLinks[0]

              return (
                <div
                  key={turma.id}
                  className="flex flex-col gap-4 rounded-2xl border bg-background p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-base font-semibold">
                      Turma {turma.codigo_turma}
                    </p>

                    <p className="truncate text-sm text-muted-foreground">
                      {turma.professor ?? 'Docente não informado'}
                    </p>
                  </div>

                  {link ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={link.url_whatsapp}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={cn(
                          buttonVariants({ size: 'lg' }),
                          'h-11 min-w-40 bg-emerald-100 px-4 text-sm font-bold text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900',
                        )}
                      >
                        Entrar no Grupo
                        <ExternalLink className="size-4" />
                      </a>

                      <ReportModal
                        linkId={link.id}
                        codigoTurma={turma.codigo_turma}
                      />
                    </div>
                  ) : (
                    <AddLinkModal
                      turmaId={turma.id}
                      codigoTurma={turma.codigo_turma}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {totalTurmas === 0 && (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhuma turma disponível para esta disciplina no semestre vigente.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
