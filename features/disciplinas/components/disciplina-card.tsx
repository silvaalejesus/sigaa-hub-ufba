import { MessageCircle, Users } from 'lucide-react'
import type { DisciplinaComTurmas } from '@/types/database'

interface DisciplinaCardProps {
  disciplina: DisciplinaComTurmas
}

export function DisciplinaCard({ disciplina }: DisciplinaCardProps) {
  const totalTurmas = disciplina.turmas.length
  const totalLinks = disciplina.turmas.reduce(
    (acc, t) => acc + t.links.length,
    0,
  )

  return (
    <li className="group rounded-3xl border-2 border-border bg-card p-6 shadow-positivus transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-block rounded-md bg-primary px-2 py-0.5 font-mono text-sm font-semibold text-primary-foreground">
            {disciplina.codigo}
          </span>
          <h3 className="mt-3 text-lg font-bold leading-snug text-card-foreground text-balance">
            {disciplina.nome}
          </h3>
          {disciplina.departamento && (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {disciplina.departamento}
            </p>
          )}
        </div>
      </div>

      <hr className="my-4 border-border" />

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="size-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-card-foreground">
              {totalTurmas}
            </strong>{' '}
            {totalTurmas === 1 ? 'turma' : 'turmas'}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-card-foreground">
              {totalLinks}
            </strong>{' '}
            {totalLinks === 1 ? 'grupo' : 'grupos'} de WhatsApp
          </span>
        </span>
      </div>

      {totalLinks > 0 && (
        <ul className="mt-4 flex flex-col gap-2" aria-label="Grupos de WhatsApp">
          {disciplina.turmas.flatMap((turma) =>
            turma.links.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url_whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Turma {turma.codigo_turma}
                    {turma.professor ? ` · ${turma.professor}` : ''}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground group-hover:text-inherit">
                    Entrar
                  </span>
                </a>
              </li>
            )),
          )}
        </ul>
      )}
    </li>
  )
}
