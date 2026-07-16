import { MessageCircle, ShieldCheck, Zap } from "lucide-react";
import { Suspense } from "react";

import { BackToTop } from "@/components/back-to-top";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DisciplinaList } from "@/features/disciplinas/components/disciplina-list";
import { SearchBar } from "@/features/disciplinas/components/search-bar";
import { buscarDepartamentos } from "@/features/disciplinas/queries";
import { CURRENT_SEMESTER } from "@/lib/semester";

interface HomePageProps {
  searchParams: Promise<{
    q?: string;
    departamento?: string;
    grupos?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q, departamento, grupos } = await searchParams;
  const query = q?.trim() ?? "";
  const departamentoSelecionado = departamento?.trim() ?? "";
  const apenasComGrupos = grupos === "1";
  const departamentos = await buscarDepartamentos();

  return (
    <>
      <SiteHeader />

      <main id="top" className="mx-auto w-full max-w-6xl px-4 py-8">
        <section className="rounded-[2rem] border bg-gradient-to-br from-background via-background to-muted/70 p-6 shadow-sm md:p-10">
          <p className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:border-primary/20 dark:bg-primary/10 dark:text-primary">
            UFBA · Semestre {CURRENT_SEMESTER}
          </p>

          <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
            Encontre os grupos de WhatsApp das suas turmas
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            Pesquise disciplinas do SIGAA, veja as turmas abertas do semestre
            vigente e acesse os links dos grupos compartilhados pela comunidade.
            Tudo em um só lugar, sem precisar de conta.
          </p>

          <div className="mt-8">
            <Suspense fallback={<SearchBarSkeleton />}>
              <SearchBar
                defaultValue={query}
                defaultDepartamento={departamentoSelecionado}
                defaultApenasComGrupos={apenasComGrupos}
                departamentos={departamentos}
              />
            </Suspense>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                {query.length > 0
                  ? `Resultados para "${query}"`
                  : "Disciplinas"}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {departamentoSelecionado
                  ? `Filtrando por ${departamentoSelecionado}.`
                  : "Use os filtros para encontrar disciplinas por nome, código ou departamento."}
              </p>
            </div>
          </div>

          <Suspense
            key={`${query}-${departamentoSelecionado}-${apenasComGrupos}`}
            fallback={<ListSkeleton />}
          >
            <DisciplinaList
              query={query}
              departamento={departamentoSelecionado}
              apenasComGrupos={apenasComGrupos}
            />
          </Suspense>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<Zap className="size-5" />}
            title="Busca rápida"
            description="Digite o nome ou código da disciplina e veja as turmas do semestre vigente instantaneamente."
          />

          <FeatureCard
            icon={<MessageCircle className="size-5" />}
            title="Links colaborativos"
            description="Adicione e acesse links de convite do chat.whatsapp.com de forma comunitária."
            highlighted
          />

          <FeatureCard
            icon={<ShieldCheck className="size-5" />}
            title="Moderação da comunidade"
            description="Denuncie links expirados, incorretos ou suspeitos para manter o SIGAA Hub útil."
          />
        </section>
      </main>

      <SiteFooter />
      <BackToTop />
    </>
  );
}

function SearchBarSkeleton() {
  return <div className="h-40 animate-pulse rounded-3xl border bg-muted/60" />;
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-56 animate-pulse rounded-3xl border bg-muted/50"
        />
      ))}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  highlighted = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlighted?: boolean;
}) {
  return (
    <article
      className={
        highlighted
          ? "rounded-3xl border border-primary/40 bg-primary/50 p-5 text-primary-foreground dark:border-primary/20 dark:bg-primary/10 dark:text-foreground"
          : "rounded-3xl border bg-card p-5"
      }
    >
      <div
        className={
          highlighted
            ? "mb-4 flex size-10 items-center justify-center rounded-2xl bg-background/80 text-foreground dark:bg-background"
            : "mb-4 flex size-10 items-center justify-center rounded-2xl bg-background"
        }
      >
        {icon}
      </div>

      <h3 className="font-semibold">{title}</h3>

      <p
        className={
          highlighted
            ? "mt-2 text-sm leading-6 text-primary-foreground/80 dark:text-muted-foreground"
            : "mt-2 text-sm leading-6 text-muted-foreground"
        }
      >
        {description}
      </p>
    </article>
  );
}
