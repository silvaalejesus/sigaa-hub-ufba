import { CURRENT_SEMESTER } from "@/lib/semester";
import { reportServerError } from "@/lib/observability/report-server-error";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import type {
  PublicSystemStatus,
  ScraperRunStatus,
  ServiceStatus,
} from "./types";
import {
  calculateOverallStatus,
  isAbandonedRun,
  parseStaleAfterHours,
} from "./utils";

function getQueryError<T>(
  result: PromiseSettledResult<{ data: T; error: unknown }>,
): unknown | null {
  if (result.status === "rejected") {
    return result.reason;
  }

  return result.value.error ?? null;
}

function reportQueryFailure(operation: string, error: unknown): void {
  // A falha real segue apenas para a observabilidade do servidor. A página e o
  // endpoint nunca devolvem mensagens SQL, URLs, configuração ou tokens.
  reportServerError(error, operation);
}

function toNullableCount(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getPublicSystemStatus(): Promise<PublicSystemStatus> {
  const checkedAt = new Date().toISOString();
  const staleAfterHours = parseStaleAfterHours(
    process.env.STATUS_STALE_AFTER_HOURS,
  );

  try {
    const supabase = createPublicServerClient();
    const [health, scraper, subjects, classes, activeLinks] =
      await Promise.allSettled([
        supabase.rpc("app_health_check"),
        supabase.rpc("get_public_scraper_status", {
          p_semester: CURRENT_SEMESTER,
        }),
        supabase.rpc("count_public_subjects", {
          p_semester: CURRENT_SEMESTER,
        }),
        supabase.rpc("count_public_classes", {
          p_semester: CURRENT_SEMESTER,
        }),
        supabase.rpc("count_public_active_links", {
          p_semester: CURRENT_SEMESTER,
        }),
      ]);

    const healthError = getQueryError(health);
    const scraperError = getQueryError(scraper);
    const subjectsError = getQueryError(subjects);
    const classesError = getQueryError(classes);
    const activeLinksError = getQueryError(activeLinks);

    const healthFailed =
      healthError !== null ||
      health.status !== "fulfilled" ||
      health.value.data !== true;
    const scraperFailed = scraperError !== null;
    const subjectsFailed = subjectsError !== null;
    const classesFailed = classesError !== null;
    const activeLinksFailed = activeLinksError !== null;

    if (healthFailed) {
      reportQueryFailure(
        "health_check",
        healthError ?? new Error("Health check público retornou resposta inválida."),
      );
    }
    if (scraperFailed) reportQueryFailure("scraper_status", scraperError);
    if (subjectsFailed) reportQueryFailure("subjects_count", subjectsError);
    if (classesFailed) reportQueryFailure("classes_count", classesError);
    if (activeLinksFailed) {
      reportQueryFailure("active_links_count", activeLinksError);
    }

    const scraperRow =
      !scraperFailed && scraper.status === "fulfilled"
        ? (scraper.value.data?.[0] ?? null)
        : null;

    const lastRunStatus =
      (scraperRow?.last_run_status as ScraperRunStatus | null) ?? null;
    const lastRunStartedAt = scraperRow?.last_run_started_at ?? null;
    const lastRunFinishedAt = scraperRow?.last_run_finished_at ?? null;
    const abandoned = isAbandonedRun({
      status: lastRunStatus,
      startedAt: lastRunStartedAt,
      checkedAt,
    });

    const databaseAvailable = !healthFailed;
    const hasPartialQueryFailure =
      scraperFailed || subjectsFailed || classesFailed || activeLinksFailed;
    const lastSuccessfulSyncAt = scraperRow?.last_successful_sync_at ?? null;

    const overall = calculateOverallStatus({
      databaseAvailable,
      hasPartialQueryFailure,
      checkedAt,
      staleAfterHours,
      lastSuccessfulSyncAt,
      lastRunStatus,
      lastRunStartedAt,
    });

    const synchronizationStatus: ServiceStatus = calculateOverallStatus({
      databaseAvailable,
      hasPartialQueryFailure: scraperFailed,
      checkedAt,
      staleAfterHours,
      lastSuccessfulSyncAt,
      lastRunStatus,
      lastRunStartedAt,
    });

    return {
      overall,
      checkedAt,
      semester: CURRENT_SEMESTER,
      staleAfterHours,
      services: {
        web: "operational",
        database: databaseAvailable ? "operational" : "unavailable",
        synchronization: synchronizationStatus,
      },
      counts: {
        subjects:
          !subjectsFailed && subjects.status === "fulfilled"
            ? toNullableCount(subjects.value.data)
            : null,
        classes:
          !classesFailed && classes.status === "fulfilled"
            ? toNullableCount(classes.value.data)
            : null,
        activeLinks:
          !activeLinksFailed && activeLinks.status === "fulfilled"
            ? toNullableCount(activeLinks.value.data)
            : null,
      },
      lastSuccessfulSyncAt,
      lastSuccessfulDurationSeconds:
        scraperRow?.last_successful_duration_seconds ?? null,
      lastRun: scraperRow
        ? {
            status: lastRunStatus,
            semester: scraperRow.last_run_semester,
            startedAt: lastRunStartedAt,
            finishedAt: lastRunFinishedAt,
            durationSeconds:
              lastRunStartedAt && lastRunFinishedAt
                ? Math.max(
                    0,
                    Math.floor(
                      (Date.parse(lastRunFinishedAt) -
                        Date.parse(lastRunStartedAt)) /
                        1000,
                    ),
                  )
                : null,
            abandoned,
          }
        : null,
    };
  } catch (error) {
    reportQueryFailure("status_bootstrap", error);

    return {
      overall: "unavailable",
      checkedAt,
      semester: CURRENT_SEMESTER,
      staleAfterHours,
      services: {
        web: "operational",
        database: "unavailable",
        synchronization: "unavailable",
      },
      counts: {
        subjects: null,
        classes: null,
        activeLinks: null,
      },
      lastSuccessfulSyncAt: null,
      lastSuccessfulDurationSeconds: null,
      lastRun: null,
    };
  }
}
