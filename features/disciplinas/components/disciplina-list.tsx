import { SearchX } from "lucide-react";

import { DisciplinaCard } from "@/features/disciplinas/components/disciplina-card";
import { buscarDisciplinas } from "@/features/disciplinas/queries";

interface DisciplinaListProps {
  query?: string;
  departamento?: string;
  apenasComGrupos?: boolean;
}

export async function DisciplinaList({
  query,
  departamento,
  apenasComGrupos = false,
}: DisciplinaListProps) {
  const disciplinas = await buscarDisciplinas({
    query,
    departamento,
    apenasComGrupos,
  });

  const temFiltro =
    (query?.trim().length ?? 0) > 0 ||
    (departamento?.trim().length ?? 0) > 0 ||
    apenasComGrupos;

  if (disciplinas.length === 0) {
    return (
      <EmptyState
        hasFilter={temFiltro}
        query={query}
        departamento={departamento}
        apenasComGrupos={apenasComGrupos}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {disciplinas.map((disciplina) => (
        <DisciplinaCard key={disciplina.id} disciplina={disciplina} />
      ))}
    </div>
  );
}

function EmptyState({
  hasFilter,
  query,
  departamento,
  apenasComGrupos,
}: {
  hasFilter: boolean;
  query?: string;
  departamento?: string;
  apenasComGrupos?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-dashed bg-muted/30 px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-background">
        <SearchX className="size-6 text-muted-foreground" />
      </div>

      {hasFilter ? (
        <>
          <h3 className="text-lg font-semibold">
            Nenhuma disciplina encontrada
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Não encontramos disciplinas para os filtros aplicados
            {query ? `, busca "${query}"` : ""}
            {departamento ? `, departamento "${departamento}"` : ""}
            {apenasComGrupos ? ", apenas com grupos disponíveis" : ""}.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold">Comece pela busca</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Digite o nome ou o código de uma disciplina para ver as turmas
            abertas no semestre 2026.2 e os grupos de WhatsApp disponíveis.
          </p>
        </>
      )}
    </div>
  );
}
