import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateOverallStatus,
  formatDuration,
  isAbandonedRun,
  parseStaleAfterHours,
} from "./utils.ts";

test("calcula estado operacional", () => {
  assert.equal(
    calculateOverallStatus({
      databaseAvailable: true,
      hasPartialQueryFailure: false,
      checkedAt: "2026-07-14T12:00:00.000Z",
      staleAfterHours: 384,
      lastSuccessfulSyncAt: "2026-07-10T12:00:00.000Z",
      lastRunStatus: "success",
      lastRunStartedAt: "2026-07-10T11:00:00.000Z",
    }),
    "operational",
  );
});

test("identifica dados desatualizados", () => {
  assert.equal(
    calculateOverallStatus({
      databaseAvailable: true,
      hasPartialQueryFailure: false,
      checkedAt: "2026-07-14T12:00:00.000Z",
      staleAfterHours: 24,
      lastSuccessfulSyncAt: "2026-07-10T12:00:00.000Z",
      lastRunStatus: "success",
      lastRunStartedAt: "2026-07-10T11:00:00.000Z",
    }),
    "stale",
  );
});

test("identifica execução running abandonada", () => {
  assert.equal(
    isAbandonedRun({
      status: "running",
      startedAt: "2026-07-14T00:00:00.000Z",
      checkedAt: "2026-07-14T12:00:00.000Z",
      abandonedAfterHours: 6,
    }),
    true,
  );
});

test("classifica execução running abandonada como degradada", () => {
  assert.equal(
    calculateOverallStatus({
      databaseAvailable: true,
      hasPartialQueryFailure: false,
      checkedAt: "2026-07-14T12:00:00.000Z",
      staleAfterHours: 384,
      lastSuccessfulSyncAt: "2026-07-14T10:00:00.000Z",
      lastRunStatus: "running",
      lastRunStartedAt: "2026-07-14T00:00:00.000Z",
    }),
    "degraded",
  );
});

test("prioriza falha da última execução", () => {
  assert.equal(
    calculateOverallStatus({
      databaseAvailable: true,
      hasPartialQueryFailure: false,
      checkedAt: "2026-07-14T12:00:00.000Z",
      staleAfterHours: 384,
      lastSuccessfulSyncAt: "2026-07-14T10:00:00.000Z",
      lastRunStatus: "failed",
      lastRunStartedAt: "2026-07-14T11:00:00.000Z",
    }),
    "degraded",
  );
});

test("formata duração", () => {
  assert.equal(formatDuration(65), "1 min 5 s");
  assert.equal(formatDuration(3661), "1 h 1 min");
  assert.equal(formatDuration(null), "Não disponível");
});

test("faz parsing seguro de STATUS_STALE_AFTER_HOURS", () => {
  assert.equal(parseStaleAfterHours("720"), 720);
  assert.equal(parseStaleAfterHours("0"), 384);
  assert.equal(parseStaleAfterHours("3.5"), 384);
  assert.equal(parseStaleAfterHours("invalido"), 384);
  assert.equal(parseStaleAfterHours(undefined), 384);
});
