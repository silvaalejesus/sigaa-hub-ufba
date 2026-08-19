const LINK_NOTIFICATION_FORM_NAME = "sigaa-hub-link-added";
const NOTIFICATION_TIMEOUT_MS = 3_000;

interface LinkAddedNotificationInput {
  turmaId: string;
  whatsappUrl: string;
  submitterName: string;
  submitterRegistration: string;
  submitterEmail: string;
}

export type LinkNotificationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "NOTIFICATION_SITE_URL_UNAVAILABLE"
        | "NOTIFICATION_TIMEOUT"
        | "NOTIFICATION_HTTP_ERROR"
        | "NOTIFICATION_NETWORK_ERROR";
    };

function getSiteUrl(): string | null {
  const rawUrl =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;

  if (!rawUrl) return null;

  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

export async function notifyLinkAdded(
  input: LinkAddedNotificationInput,
): Promise<LinkNotificationResult> {
  const siteUrl = getSiteUrl();
  if (!siteUrl) {
    return { ok: false, code: "NOTIFICATION_SITE_URL_UNAVAILABLE" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOTIFICATION_TIMEOUT_MS);

  try {
    const response = await fetch(new URL("/__forms.html", siteUrl), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        "form-name": LINK_NOTIFICATION_FORM_NAME,
        nome: input.submitterName,
        matricula: input.submitterRegistration,
        email: input.submitterEmail,
        turma_id: input.turmaId,
        url_whatsapp: input.whatsappUrl,
        submitted_at: new Date().toISOString(),
        contact_company: "",
      }).toString(),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, code: "NOTIFICATION_HTTP_ERROR" };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, code: "NOTIFICATION_TIMEOUT" };
    }

    return { ok: false, code: "NOTIFICATION_NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}
