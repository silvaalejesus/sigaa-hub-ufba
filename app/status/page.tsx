import type { Metadata } from "next";
import {
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  ExternalLink,
  Globe2,
  Link2,
  RefreshCw,
  TriangleAlert,
  UsersRound,
  XCircle,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicSystemStatus } from "@/features/status/queries";
import type { ScraperRunStatus, ServiceStatus } from "@/features/status/types";
import {
  formatBahiaDateTime,
  formatDuration,
} from "@/features/status/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Status do sistema | SIGAA Hub UFBA",
  description:
    "Acompanhe a disponibilidade e a atualização dos dados do SIGAA Hub UFBA.",
};

const STATUS_CONTENT: Record<
  ServiceStatus,
  { label: string; description: string; icon: typeof CheckCircle2 }
> = {
  operational: {
    label: "Operacional",
    description: "Serviços essenciais e dados dentro do intervalo esperado.",
    icon: CheckCircle2,
  },
  degraded: {
    label: "Degradado",
    description: "O sistema responde, mas uma verificação requer atenção.",
    icon: TriangleAlert,
  },
  stale: {
    label: "Dados desatualizados",
    description: "A aplicação responde, mas a sincronização está atrasada.",
    icon: Clock3,
  },
  unavailable: {
    label: "Indisponível",
    description: "Uma dependência essencial não respondeu à verificação.",
    icon: XCircle,
  },
};

const RUN_STATUS_LABELS: Record<ScraperRunStatus, string> = {
  running: "Em execução",
  success: "Sucesso",
  partial: "Concluída parcialmente",
  failed: "Falha",
};

export default async function StatusPage() {
  const status = await getPublicSystemStatus();
  const overall = STATUS_CONTENT[status.overall];
  const OverallIcon = overall.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ExternalLink className="size-4" aria-hidden="true" />
            Verificação pública do SIGAA Hub UFBA
          </div>
          <div className="flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Status do sistema
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Disponibilidade da aplicação, acesso ao banco e atualização dos
                dados públicos do semestre vigente.
              </p>
            </div>
            <div
              className="flex min-w-56 items-center gap-3 rounded-xl border bg-background px-4 py-3"
              role="status"
            >
              <OverallIcon className="size-6 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">{overall.label}</p>
                <p className="text-xs text-muted-foreground">
                  {overall.description}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section aria-labelledby="services-title" className="mb-8">
          <h2 id="services-title" className="mb-4 text-xl font-semibold">
            Serviços
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <ServiceCard
              title="Aplicação web"
              description="A camada Next.js respondeu a esta página."
              icon={Globe2}
              status={status.services.web}
            />
            <ServiceCard
              title="Banco Supabase"
              description="Consulta anônima e leve ao banco de dados."
              icon={Database}
              status={status.services.database}
            />
            <ServiceCard
              title="Sincronização SIGAA"
              description="Estado da última coleta e gravação no Supabase."
              icon={RefreshCw}
              status={status.services.synchronization}
            />
          </div>
        </section>

        <section aria-labelledby="data-title" className="mb-8">
          <h2 id="data-title" className="mb-4 text-xl font-semibold">
            Dados atuais
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Semestre"
              value={status.semester}
              icon={Clock3}
            />
            <MetricCard
              label="Disciplinas"
              value={formatCount(status.counts.subjects)}
              icon={BookOpen}
            />
            <MetricCard
              label="Turmas"
              value={formatCount(status.counts.classes)}
              icon={UsersRound}
            />
            <MetricCard
              label="Links ativos"
              value={formatCount(status.counts.activeLinks)}
              icon={Link2}
            />
          </div>
        </section>

        <section
          aria-labelledby="sync-title"
          className="mb-8 rounded-2xl border bg-card p-6 shadow-sm"
        >
          <h2 id="sync-title" className="mb-5 text-xl font-semibold">
            Última sincronização
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <DescriptionItem label="Último sucesso">
              <DateValue value={status.lastSuccessfulSyncAt} />
            </DescriptionItem>
            <DescriptionItem label="Duração do último sucesso">
              {formatDuration(status.lastSuccessfulDurationSeconds)}
            </DescriptionItem>
            <DescriptionItem label="Resultado da última execução">
              {status.lastRun?.status
                ? RUN_STATUS_LABELS[status.lastRun.status]
                : "Sem execução registrada"}
              {status.lastRun?.abandoned ? " (possivelmente abandonada)" : ""}
            </DescriptionItem>
            <DescriptionItem label="Limite de atualização">
              {status.staleAfterHours} horas
            </DescriptionItem>
            <DescriptionItem label="Início da última execução">
              <DateValue value={status.lastRun?.startedAt ?? null} />
            </DescriptionItem>
            <DescriptionItem label="Término da última execução">
              <DateValue value={status.lastRun?.finishedAt ?? null} />
            </DescriptionItem>
            <DescriptionItem label="Duração da última execução">
              {formatDuration(status.lastRun?.durationSeconds ?? null)}
            </DescriptionItem>
            <DescriptionItem label="Horário da verificação">
              <DateValue value={status.checkedAt} />
            </DescriptionItem>
          </dl>
        </section>

        <aside className="flex gap-3 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            O SIGAA Hub UFBA é uma iniciativa independente e não possui vínculo
            oficial com a UFBA ou com o SIGAA.
          </p>
        </aside>
      </main>

      <SiteFooter />
    </div>
  );
}

function ServiceCard({
  title,
  description,
  icon: Icon,
  status,
}: {
  title: string;
  description: string;
  icon: typeof Globe2;
  status: ServiceStatus;
}) {
  const content = STATUS_CONTENT[status];
  const StatusIcon = content.icon;

  return (
    <article className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <Icon className="size-6" aria-hidden="true" />
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
          <StatusIcon className="size-3.5" aria-hidden="true" />
          {content.label}
        </span>
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </article>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof BookOpen;
}) {
  return (
    <article className="rounded-xl border bg-card p-5 shadow-sm">
      <Icon className="mb-4 size-5 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </article>
  );
}

function DescriptionItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}

function DateValue({ value }: { value: string | null }) {
  if (!value) {
    return <>Não disponível</>;
  }

  return <time dateTime={value}>{formatBahiaDateTime(value)}</time>;
}

function formatCount(value: number | null): string {
  return value === null ? "Indisponível" : value.toLocaleString("pt-BR");
}
