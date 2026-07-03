"use client";

import { Building2, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/utils/use-debounced-value";

const TODOS_DEPARTAMENTOS_VALUE = "__todos__";

interface SearchBarProps {
  defaultValue?: string;
  defaultDepartamento?: string;
  departamentos?: string[];
  placeholder?: string;
}

export function SearchBar({
  defaultValue = "",
  defaultDepartamento = "",
  departamentos = [],
  placeholder = "Busque por nome ou código da disciplina (ex: MATA37)",
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [term, setTerm] = useState(defaultValue);
  const [departamento, setDepartamento] = useState(
    defaultDepartamento || TODOS_DEPARTAMENTOS_VALUE,
  );

  const debouncedTerm = useDebouncedValue(term, 300);
  const hasMounted = useRef(false);

  function updateUrl(nextValues: { q?: string; departamento?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextValues.q !== undefined) {
      const trimmed = nextValues.q.trim();

      if (trimmed.length > 0) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
    }

    if (nextValues.departamento !== undefined) {
      const trimmedDepartamento = nextValues.departamento.trim();

      if (
        trimmedDepartamento.length > 0 &&
        trimmedDepartamento !== TODOS_DEPARTAMENTOS_VALUE
      ) {
        params.set("departamento", trimmedDepartamento);
      } else {
        params.delete("departamento");
      }
    }

    const queryString = params.toString();

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    updateUrl({ q: debouncedTerm });

    // searchParams intencionalmente omitido para evitar loop com snapshots novos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm, pathname, router]);

  function handleClear() {
    setTerm("");
    updateUrl({ q: "" });
  }

  function handleDepartamentoChange(value: string) {
    setDepartamento(value);
    updateUrl({ departamento: value });
  }

  return (
    <div className="grid gap-3 rounded-3xl border bg-background/80 p-3 shadow-sm backdrop-blur md:grid-cols-[minmax(0,1fr)_320px]">
      <form
        onSubmit={(event) => event.preventDefault()}
        className="relative w-full"
      >
        <label htmlFor="disciplina-search" className="sr-only">
          Buscar disciplina
        </label>

        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />

        <Input
          id="disciplina-search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={placeholder}
          className="h-12 border-0 bg-transparent pl-12 pr-12 text-base shadow-none focus-visible:ring-0"
        />

        {term.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={handleClear}
          >
            <X className="size-4" />
          </Button>
        )}
      </form>

      <div className="flex items-center gap-2 rounded-2xl border bg-muted/30 px-3">
        <Building2 className="size-4 shrink-0 text-muted-foreground" />

        <Select value={departamento} onValueChange={handleDepartamentoChange}>
          <SelectTrigger className="h-12 border-0 bg-transparent px-0 shadow-none focus:ring-0">
            <SelectValue placeholder="Instituto/Departamento" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value={TODOS_DEPARTAMENTOS_VALUE}>
              Todos os departamentos
            </SelectItem>

            {departamentos.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
