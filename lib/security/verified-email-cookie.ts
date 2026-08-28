import { createHmac, timingSafeEqual } from "node:crypto";

export const VERIFIED_EMAIL_COOKIE_NAME = "sigaa_hub_verified_email";
export const VERIFIED_EMAIL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const COOKIE_VERSION = "v1";

function getSecret(): string | null {
  const secret = process.env.EMAIL_VERIFICATION_SECRET?.trim() ?? "";
  return secret.length >= 32 ? secret : null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createSignature(email: string, expiresAt: number): string | null {
  const secret = getSecret();
  if (!secret) return null;

  return createHmac("sha256", secret)
    .update(
      `verified-email:${COOKIE_VERSION}:${normalizeEmail(email)}:${expiresAt}`,
      "utf8",
    )
    .digest("hex");
}

export function createVerifiedEmailCookieValue(email: string): string {
  const expiresAt =
    Math.floor(Date.now() / 1000) + VERIFIED_EMAIL_COOKIE_MAX_AGE_SECONDS;
  const signature = createSignature(email, expiresAt);

  if (!signature) {
    throw new Error("EMAIL_VERIFICATION_SECRET is not configured.");
  }

  return `${COOKIE_VERSION}.${expiresAt}.${signature}`;
}

export function isVerifiedEmailCookieValid(
  cookieValue: string | null | undefined,
  email: string,
): boolean {
  if (!cookieValue) return false;

  const [version, rawExpiresAt, providedSignature, ...rest] =
    cookieValue.split(".");

  if (
    rest.length > 0 ||
    version !== COOKIE_VERSION ||
    !/^\d{10,12}$/.test(rawExpiresAt ?? "") ||
    !/^[0-9a-f]{64}$/i.test(providedSignature ?? "")
  ) {
    return false;
  }

  const expiresAt = Number(rawExpiresAt);
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    return false;
  }

  const expectedSignature = createSignature(email, expiresAt);
  if (!expectedSignature) return false;

  try {
    return timingSafeEqual(
      Buffer.from(providedSignature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch {
    return false;
  }
}
