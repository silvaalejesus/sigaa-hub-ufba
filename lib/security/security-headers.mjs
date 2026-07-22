function safeOrigin(rawValue) {
  if (!rawValue) return null;

  try {
    return new URL(rawValue).origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicyReportOnly(
  environment = process.env,
) {
  const connectOrigins = new Set([
    "'self'",
    "https://ingesteer.services-prod.nsvcs.net",
  ]);

  const supabaseOrigin = safeOrigin(environment.NEXT_PUBLIC_SUPABASE_URL);
  const sentryOrigin = safeOrigin(
    environment.NEXT_PUBLIC_SENTRY_DSN || environment.SENTRY_DSN,
  );

  if (supabaseOrigin) {
    connectOrigins.add(supabaseOrigin);
    connectOrigins.add(supabaseOrigin.replace("https://", "wss://"));
  }

  if (sentryOrigin) {
    connectOrigins.add(sentryOrigin);
  } else {
    connectOrigins.add("https://*.ingest.sentry.io");
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline'",
    `connect-src ${[...connectOrigins].join(" ")}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");
}

export function buildSecurityHeaders(environment = process.env) {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Content-Security-Policy-Report-Only",
      value: buildContentSecurityPolicyReportOnly(environment),
    },
  ];
}
