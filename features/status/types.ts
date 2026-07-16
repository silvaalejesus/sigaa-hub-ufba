export type ServiceStatus =
  | "operational"
  | "degraded"
  | "stale"
  | "unavailable";

export type ScraperRunStatus =
  | "running"
  | "success"
  | "partial"
  | "failed";

export type PublicScraperRun = {
  status: ScraperRunStatus | null;
  semester: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationSeconds: number | null;
  abandoned: boolean;
};

export type PublicSystemStatus = {
  overall: ServiceStatus;
  checkedAt: string;
  semester: string;
  staleAfterHours: number;
  services: {
    web: ServiceStatus;
    database: ServiceStatus;
    synchronization: ServiceStatus;
  };
  counts: {
    subjects: number | null;
    classes: number | null;
    activeLinks: number | null;
  };
  lastSuccessfulSyncAt: string | null;
  lastSuccessfulDurationSeconds: number | null;
  lastRun: PublicScraperRun | null;
};
