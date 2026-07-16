import type { ScraperRunStatus, ServiceStatus } from "./types";

export const DEFAULT_STALE_AFTER_HOURS = 384;
export const ABANDONED_RUN_AFTER_HOURS = 6;

const MAX_STALE_AFTER_HOURS = 24 * 365;

export function parseStaleAfterHours(value: string | undefined): number {
  if (!value) {
    return DEFAULT_STALE_AFTER_HOURS;
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed <= 0 ||
    parsed > MAX_STALE_AFTER_HOURS
  ) {
    return DEFAULT_STALE_AFTER_HOURS;
  }

  return parsed;
}

export function isOlderThanHours(
  isoDate: string | null,
  referenceIsoDate: string,
  hours: number,
): boolean {
  if (!isoDate) {
    return false;
  }

  const value = Date.parse(isoDate);
  const reference = Date.parse(referenceIsoDate);

  if (!Number.isFinite(value) || !Number.isFinite(reference)) {
    return false;
  }

  return reference - value > hours * 60 * 60 * 1000;
}

export function isAbandonedRun(input: {
  status: ScraperRunStatus | null;
  startedAt: string | null;
  checkedAt: string;
  abandonedAfterHours?: number;
}): boolean {
  return (
    input.status === "running" &&
    isOlderThanHours(
      input.startedAt,
      input.checkedAt,
      input.abandonedAfterHours ?? ABANDONED_RUN_AFTER_HOURS,
    )
  );
}

export function calculateOverallStatus(input: {
  databaseAvailable: boolean;
  hasPartialQueryFailure: boolean;
  checkedAt: string;
  staleAfterHours: number;
  lastSuccessfulSyncAt: string | null;
  lastRunStatus: ScraperRunStatus | null;
  lastRunStartedAt: string | null;
}): ServiceStatus {
  if (!input.databaseAvailable) {
    return "unavailable";
  }

  if (input.hasPartialQueryFailure) {
    return "degraded";
  }

  if (
    isAbandonedRun({
      status: input.lastRunStatus,
      startedAt: input.lastRunStartedAt,
      checkedAt: input.checkedAt,
    })
  ) {
    return "degraded";
  }

  if (input.lastRunStatus === "failed" || input.lastRunStatus === "partial") {
    return "degraded";
  }

  if (!input.lastSuccessfulSyncAt) {
    return "degraded";
  }

  if (
    isOlderThanHours(
      input.lastSuccessfulSyncAt,
      input.checkedAt,
      input.staleAfterHours,
    )
  ) {
    return "stale";
  }

  return "operational";
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "Não disponível";
  }

  const rounded = Math.floor(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  if (minutes > 0) {
    return `${minutes} min ${remainingSeconds} s`;
  }

  return `${remainingSeconds} s`;
}

export function formatBahiaDateTime(isoDate: string): string {
  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bahia",
  }).format(parsed);
}
