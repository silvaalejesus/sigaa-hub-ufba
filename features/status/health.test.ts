import assert from "node:assert/strict";
import test from "node:test";
import { executeHealthCheck } from "./health.ts";

const fixedNow = () => new Date("2026-07-14T00:00:00.000Z");

test("health check saudável retorna 200 e payload mínimo", async () => {
  const response = await executeHealthCheck(async () => true, fixedNow);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.deepEqual(await response.json(), {
    status: "ok",
    timestamp: "2026-07-14T00:00:00.000Z",
  });
});

test("health check indisponível retorna 503 sem detalhes internos", async () => {
  const response = await executeHealthCheck(async () => {
    throw new Error("mensagem SQL que não deve sair no payload");
  }, fixedNow);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    status: "degraded",
    timestamp: "2026-07-14T00:00:00.000Z",
  });
});
