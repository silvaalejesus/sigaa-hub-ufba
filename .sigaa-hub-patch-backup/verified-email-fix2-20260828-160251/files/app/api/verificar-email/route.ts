import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { notifyLinkAdded } from "@/lib/notifications/netlify-link-notification";
import { getIdSuffix, writeSafeLog } from "@/lib/observability/safe-logger";
import { parseLinkEmailVerificationToken } from "@/lib/security/link-email-verification";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/privileged-server";

function redirectWithStatus(request: Request, status: string) {
  const url = new URL("/verificar-email/resultado", request.url);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  let token = "";

  try {
    const formData = await request.formData();
    const rawToken = formData.get("token");
    token = typeof rawToken === "string" ? rawToken.trim() : "";
  } catch {
    return redirectWithStatus(request, "invalid");
  }

  if (!token || token.length > 8192) {
    return redirectWithStatus(request, "invalid");
  }

  const parsedToken = parseLinkEmailVerificationToken(token);
  if (!parsedToken.ok) {
    return redirectWithStatus(
      request,
      parsedToken.code === "EXPIRED" ? "expired" : "invalid",
    );
  }

  const payload = parsedToken.payload;

  try {
    const supabase = createPrivilegedSupabaseClient();
    const { data, error } = await supabase.rpc("add_link_secure", {
      p_turma_id: payload.turmaId,
      p_url_whatsapp: payload.url,
      p_reporter_fingerprint: payload.fingerprint,
      p_submitter_name: payload.nome,
      p_submitter_registration: payload.matricula,
      p_submitter_email: payload.email,
    } as never);

    if (error) {
      writeSafeLog("error", {
        event: "verified_link_creation_failed",
        code: error.code || "DATABASE_ERROR",
        resourceIdSuffix: getIdSuffix(payload.turmaId),
        environment: process.env.CONTEXT ?? process.env.NODE_ENV,
      });
      return redirectWithStatus(request, "error");
    }

    const result = typeof data === "string" ? data : String(data ?? "");

    if (result === "active_link_exists" || result === "url_already_registered") {
      return redirectWithStatus(request, "already_exists");
    }

    if (result === "rate_limited") {
      return redirectWithStatus(request, "rate_limited");
    }

    if (result !== "added") {
      return redirectWithStatus(request, "invalid");
    }

    revalidatePath("/");

    const notification = await notifyLinkAdded({
      turmaId: payload.turmaId,
      whatsappUrl: payload.url,
      submitterName: payload.nome,
      submitterRegistration: payload.matricula,
      submitterEmail: payload.email,
    });

    if (!notification.ok) {
      writeSafeLog("warn", {
        event: "link_notification_failed",
        code: notification.code,
        resourceIdSuffix: getIdSuffix(payload.turmaId),
        environment: process.env.CONTEXT ?? process.env.NODE_ENV,
      });
    }

    return redirectWithStatus(request, "success");
  } catch {
    writeSafeLog("error", {
      event: "verified_link_creation_failed",
      code: "UNEXPECTED_ERROR",
      resourceIdSuffix: getIdSuffix(payload.turmaId),
      environment: process.env.CONTEXT ?? process.env.NODE_ENV,
    });
    return redirectWithStatus(request, "error");
  }
}
