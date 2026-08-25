import { createHash } from "node:crypto";

const RESEND_SEND_URL = "https://api.resend.com/emails";

export type ResendSendResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "CONFIGURATION_ERROR"
        | "RATE_LIMITED"
        | "HTTP_ERROR"
        | "NETWORK_ERROR";
    };

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

interface SendLinkVerificationEmailInput {
  to: string;
  name: string;
  verificationUrl: string;
}

export async function sendLinkVerificationEmail(
  input: SendLinkVerificationEmailInput,
): Promise<ResendSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return { ok: false, code: "CONFIGURATION_ERROR" };
  }

  const safeName = escapeHtml(input.name);
  const safeUrl = escapeHtml(input.verificationUrl);
  const idempotencyKey = `link-verify-${createHash("sha256")
    .update(input.verificationUrl)
    .digest("hex")
    .slice(0, 48)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(RESEND_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: "Confirme o grupo enviado ao SIGAA Hub UFBA",
        text: [
          `Olá, ${input.name}.`,
          "",
          "Recebemos uma solicitação para adicionar um grupo ao SIGAA Hub UFBA.",
          "Confirme seu e-mail para publicar o grupo:",
          input.verificationUrl,
          "",
          "O link de confirmação expira em 30 minutos.",
          "Se você não realizou essa solicitação, ignore este e-mail.",
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
            <h2>Confirme seu e-mail</h2>
            <p>Olá, ${safeName}.</p>
            <p>
              Recebemos uma solicitação para adicionar um grupo ao
              <strong>SIGAA Hub UFBA</strong>.
            </p>
            <p>
              <a
                href="${safeUrl}"
                style="display:inline-block;padding:12px 18px;border-radius:8px;background:#166534;color:#fff;text-decoration:none;font-weight:600"
              >
                Confirmar e-mail
              </a>
            </p>
            <p>O link de confirmação expira em 30 minutos.</p>
            <p style="color:#6b7280;font-size:13px">
              Se você não realizou essa solicitação, ignore este e-mail.
            </p>
          </div>
        `,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.ok) return { ok: true };
    if (response.status === 429) {
      return { ok: false, code: "RATE_LIMITED" };
    }

    return { ok: false, code: "HTTP_ERROR" };
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}
