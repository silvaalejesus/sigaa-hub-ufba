import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

const TOKEN_VERSION = 1;
const TOKEN_AAD = Buffer.from("sigaa-hub-link-email-verification-v1", "utf8");
const DEFAULT_TTL_SECONDS = 30 * 60;

export interface LinkEmailVerificationPayload {
  turmaId: string;
  url: string;
  nome: string;
  matricula: string;
  email: string;
  fingerprint: string;
}

type StoredLinkEmailVerificationPayload = LinkEmailVerificationPayload & {
  v: number;
  iat: number;
  exp: number;
};

export type ParsedLinkEmailVerification =
  | { ok: true; payload: LinkEmailVerificationPayload }
  | { ok: false; code: "CONFIGURATION_ERROR" | "INVALID_TOKEN" | "EXPIRED" };

function getVerificationSecret(): string | null {
  const secret = process.env.EMAIL_VERIFICATION_SECRET?.trim() ?? "";
  return secret.length >= 32 ? secret : null;
}

function getEncryptionKey(): Buffer | null {
  const secret = getVerificationSecret();
  if (!secret) return null;
  return createHash("sha256").update(secret, "utf8").digest();
}

function isPayloadShapeValid(
  value: StoredLinkEmailVerificationPayload,
): boolean {
  return (
    value.v === TOKEN_VERSION &&
    typeof value.turmaId === "string" &&
    typeof value.url === "string" &&
    typeof value.nome === "string" &&
    typeof value.matricula === "string" &&
    typeof value.email === "string" &&
    typeof value.fingerprint === "string" &&
    /^[0-9a-f]{64}$/i.test(value.fingerprint) &&
    Number.isInteger(value.iat) &&
    Number.isInteger(value.exp)
  );
}

export function createVerificationEmailFingerprint(email: string): string {
  const secret = getVerificationSecret();
  if (!secret) {
    throw new Error("EMAIL_VERIFICATION_SECRET is not configured.");
  }

  return createHmac("sha256", secret)
    .update(`email:${email.trim().toLowerCase()}`, "utf8")
    .digest("hex");
}

export function createLinkEmailVerificationToken(
  input: LinkEmailVerificationPayload,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("EMAIL_VERIFICATION_SECRET is not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const safeTtl = Math.max(60, Math.min(ttlSeconds, 60 * 60));
  const payload: StoredLinkEmailVerificationPayload = {
    ...input,
    email: input.email.trim().toLowerCase(),
    v: TOKEN_VERSION,
    iat: now,
    exp: now + safeTtl,
  };

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(TOKEN_AAD);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function parseLinkEmailVerificationToken(
  token: string,
): ParsedLinkEmailVerification {
  const key = getEncryptionKey();
  if (!key) {
    return { ok: false, code: "CONFIGURATION_ERROR" };
  }

  try {
    const packed = Buffer.from(token, "base64url");
    if (packed.length < 12 + 16 + 1 || packed.length > 8192) {
      return { ok: false, code: "INVALID_TOKEN" };
    }

    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const encrypted = packed.subarray(28);

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(TOKEN_AAD);
    decipher.setAuthTag(tag);

    const decoded = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");

    const payload = JSON.parse(decoded) as StoredLinkEmailVerificationPayload;
    if (!isPayloadShapeValid(payload)) {
      return { ok: false, code: "INVALID_TOKEN" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return { ok: false, code: "EXPIRED" };
    }

    if (payload.iat > now + 60 || payload.exp - payload.iat > 60 * 60) {
      return { ok: false, code: "INVALID_TOKEN" };
    }

    return {
      ok: true,
      payload: {
        turmaId: payload.turmaId,
        url: payload.url,
        nome: payload.nome,
        matricula: payload.matricula,
        email: payload.email,
        fingerprint: payload.fingerprint,
      },
    };
  } catch {
    return { ok: false, code: "INVALID_TOKEN" };
  }
}

function getSiteUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.URL?.trim() ||
    process.env.DEPLOY_PRIME_URL?.trim() ||
    "";

  if (!raw) return null;

  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function buildLinkEmailVerificationUrl(token: string): string {
  const siteUrl = getSiteUrl();
  if (!siteUrl) {
    throw new Error("Public site URL is not configured.");
  }

  const url = new URL("/verificar-email", siteUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
