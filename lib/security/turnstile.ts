const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TEST_SECRET_KEY =
  "1x0000000000000000000000000000000AA";

type TurnstileSiteverifyResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export type TurnstileValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: "CONFIGURATION_ERROR" | "INVALID_TOKEN" | "NETWORK_ERROR";
    };

function getTurnstileSecret(): string | null {
  const configured = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV !== "production") {
    return TURNSTILE_TEST_SECRET_KEY;
  }

  return null;
}

function getExpectedHostnames(): Set<string> {
  return new Set(
    (process.env.TURNSTILE_EXPECTED_HOSTNAMES ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function validateTurnstileToken(
  token: string,
  expectedAction: string,
): Promise<TurnstileValidationResult> {
  const secret = getTurnstileSecret();

  if (!secret) {
    return { ok: false, code: "CONFIGURATION_ERROR" };
  }

  const normalizedToken = token.trim();
  if (!normalizedToken || normalizedToken.length > 2048) {
    return { ok: false, code: "INVALID_TOKEN" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret,
        response: normalizedToken,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, code: "NETWORK_ERROR" };
    }

    const result = (await response.json()) as TurnstileSiteverifyResponse;

    if (!result.success || result.action !== expectedAction) {
      return { ok: false, code: "INVALID_TOKEN" };
    }

    const expectedHostnames = getExpectedHostnames();
    if (expectedHostnames.size > 0) {
      const hostname = result.hostname?.trim().toLowerCase() ?? "";
      if (!expectedHostnames.has(hostname)) {
        return { ok: false, code: "INVALID_TOKEN" };
      }
    }

    return { ok: true };
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}
