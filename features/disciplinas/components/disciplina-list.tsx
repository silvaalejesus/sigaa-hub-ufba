import { DisciplinaCard } from "@/features/disciplinas/components/disciplina-card";
import { buscarDisciplinas } from "@/features/disciplinas/queries";
import { SearchX } from "lucide-react";

interface DisciplinaListProps {
  query?: string;
  departamento?: string;
}
/**
 * Server Component: executa a query no Supabase e renderiza o resultado.
 * É re-renderizado automaticamente quando `query` muda via searchParams.
 */
export async function DisciplinaList({
  query,
  departamento,
}: DisciplinaListProps) {
  const disciplinas = await buscarDisciplinas({
    query,
    departamento,
  });
  // const temBusca = (query?.trim().length ?? 0) > 0
  const temBusca =
    (query?.trim().length ?? 0) > 0 || (departamento?.trim().length ?? 0) > 0;
  if (disciplinas.length === 0) {
    return <EmptyState hasQuery={temBusca} query={query} />;
  }

  return (
    <ul
      className="grid grid-cols-1 gap-4 md:grid-cols-2"
      aria-label="Lista de disciplinas"
    >
      {disciplinas.map((disciplina) => (
        <DisciplinaCard key={disciplina.id} disciplina={disciplina} />
      ))}
    </ul>
  );
}

function EmptyState({
  hasQuery,
  query,
}: {
  hasQuery: boolean;
  query?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <SearchX className="size-8" aria-hidden="true" />
      </span>

      {hasQuery ? (
        <>
          <h3 className="mt-5 text-xl font-bold text-card-foreground">
            Nenhuma disciplina encontrada
          </h3>
          <p className="mt-2 max-w-md text-pretty text-muted-foreground">
            Não encontramos nenhuma disciplina para{" "}
            <strong className="font-semibold text-foreground">
              &quot;{query}&quot;
            </strong>
            . Verifique o nome ou código e tente novamente.
          </p>
        </>
      ) : (
        <>
          <h3 className="mt-5 text-xl font-bold text-card-foreground">
            Comece pela busca
          </h3>
          <p className="mt-2 max-w-md text-pretty text-muted-foreground">
            Digite o nome ou o código de uma disciplina para ver as turmas
            abertas no semestre 2026.1 e os grupos de WhatsApp disponíveis.
          </p>
        </>
      )}
    </div>
  );
}
