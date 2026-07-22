import assert from "node:assert/strict";
import test from "node:test";

import {
  createAbuseFingerprint,
  getTrustedClientIp,
  normalizeIpCandidate,
  type HeaderReader,
} from "./abuse-fingerprint.ts";

function headers(values: Record<string, string>): HeaderReader {
  return {
    get(name) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

test("normaliza IPv4, IPv6 e primeiro endereço válido", () => {
  assert.equal(normalizeIpCandidate(" 203.0.113.7, 10.0.0.1 "), "203.0.113.7");
  assert.equal(normalizeIpCandidate("[2001:db8::1]:443"), "2001:db8::1");
  assert.equal(normalizeIpCandidate("inválido"), null);
});

test("produção confia somente no header documentado do Netlify", () => {
  assert.equal(
    getTrustedClientIp(
      headers({ "x-forwarded-for": "203.0.113.9" }),
      "production",
    ),
    null,
  );
  assert.equal(
    getTrustedClientIp(
      headers({ "x-nf-client-connection-ip": "203.0.113.9" }),
      "production",
    ),
    "203.0.113.9",
  );
});

test("fingerprints mudam entre ações e não contêm o IP", () => {
  const headerStore = headers({
    "x-nf-client-connection-ip": "203.0.113.10",
  });
  const environment: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    ABUSE_FINGERPRINT_SECRET: "a".repeat(64),
  };

  const add = createAbuseFingerprint(headerStore, "add_link", environment);
  const report = createAbuseFingerprint(
    headerStore,
    "report_link",
    environment,
  );

  assert.equal(add.ok, true);
  assert.equal(report.ok, true);
  if (!add.ok || !report.ok) return;

  assert.match(add.fingerprint, /^[0-9a-f]{64}$/);
  assert.notEqual(add.fingerprint, report.fingerprint);
  assert.equal(add.fingerprint.includes("203.0.113.10"), false);
});

test("secret ausente em produção falha de forma controlada", () => {
  const result = createAbuseFingerprint(
    headers({ "x-nf-client-connection-ip": "203.0.113.10" }),
    "add_link",
    { NODE_ENV: "production" } as NodeJS.ProcessEnv,
  );

  assert.deepEqual(result, { ok: false, code: "MISSING_SECRET" });
});
