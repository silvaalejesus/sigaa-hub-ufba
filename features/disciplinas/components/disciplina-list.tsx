import { SearchX } from 'lucide-react'

interface Disciplina {
  id: string
  codigo: string
  nome: string
  totalTurmas: number
}

interface DisciplinaListProps {
  /** Será populado a partir do Supabase em uma etapa futura. */
  disciplinas?: Disciplina[]
}

export function DisciplinaList({ disciplinas = [] }: DisciplinaListProps) {
  if (disciplinas.length === 0) {
    return <EmptyState />
  }

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {disciplinas.map((disciplina) => (
        <li
          key={disciplina.id}
          className="rounded-3xl border-2 border-border bg-card p-6 shadow-positivus"
        >
          <span className="inline-block rounded-md bg-primary px-2 py-0.5 font-mono text-sm font-semibold text-primary-foreground">
            {disciplina.codigo}
          </span>
          <h3 className="mt-3 text-lg font-bold text-card-foreground text-balance">
            {disciplina.nome}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {disciplina.totalTurmas} turma(s) no semestre vigente
          </p>
        </li>
      ))}
    </ul>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <SearchX className="size-8" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-xl font-bold text-card-foreground">
        Comece pela busca
      </h3>
      <p className="mt-2 max-w-md text-pretty text-muted-foreground">
        Digite o nome ou o código de uma disciplina para ver as turmas abertas
        no semestre 2026.1 e os grupos de WhatsApp disponíveis.
      </p>
    </div>
  )
}
