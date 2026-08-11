"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { trackAnalyticsEvent } from "@/lib/analytics/google-analytics";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

type PageItem = number | string;

interface PaginationControlsProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function PaginationControls({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
}: PaginationControlsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const pageItems = getPageItems(currentPage, totalPages);

  function updatePagination(nextPage: number, nextPageSize = pageSize) {
    if (nextPageSize !== pageSize) {
      trackAnalyticsEvent("page_size_changed", {
        previous_page_size: pageSize,
        page_size: nextPageSize,
        total_items: totalItems,
      });
    } else if (nextPage !== currentPage) {
      trackAnalyticsEvent("pagination_changed", {
        from_page: currentPage,
        to_page: nextPage,
        page_size: pageSize,
        total_pages: totalPages,
      });
    }

    const params = new URLSearchParams(searchParams.toString());

    if (nextPage <= 1) {
      params.delete("pagina");
    } else {
      params.set("pagina", String(nextPage));
    }

    if (nextPageSize === PAGE_SIZE_OPTIONS[0]) {
      params.delete("porPagina");
    } else {
      params.set("porPagina", String(nextPageSize));
    }

    const queryString = params.toString();

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });

    requestAnimationFrame(() => {
      document.getElementById("disciplinas")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <nav
      aria-label="Paginação das disciplinas"
      className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <label htmlFor="disciplinas-page-size">Itens por página</label>
        <select
          id="disciplinas-page-size"
          value={pageSize}
          onChange={(event) => updatePagination(1, Number(event.target.value))}
          className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span>
          Mostrando {firstItem}–{lastItem} de {totalItems}
        </span>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => updatePagination(currentPage - 1)}
            aria-label="Ir para a página anterior"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>

          <span className="min-w-24 text-center text-sm text-muted-foreground sm:hidden">
            Página {currentPage} de {totalPages}
          </span>

          <div className="hidden items-center gap-1 sm:flex">
            {pageItems.map((item) =>
              typeof item === "number" ? (
                <Button
                  key={item}
                  type="button"
                  variant={item === currentPage ? "default" : "outline"}
                  size="icon"
                  className="size-8"
                  onClick={() => updatePagination(item)}
                  aria-label={`Ir para a página ${item}`}
                  aria-current={item === currentPage ? "page" : undefined}
                >
                  {item}
                </Button>
              ) : (
                <span
                  key={item}
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center text-sm text-muted-foreground"
                >
                  …
                </span>
              ),
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => updatePagination(currentPage + 1)}
            aria-label="Ir para a próxima página"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </nav>
  );
}

function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  const visiblePages = Array.from(
    new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]),
  )
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];

  visiblePages.forEach((page, index) => {
    const previousPage = visiblePages[index - 1];

    if (previousPage && page - previousPage > 1) {
      items.push(`ellipsis-${previousPage}-${page}`);
    }

    items.push(page);
  });

  return items;
}
