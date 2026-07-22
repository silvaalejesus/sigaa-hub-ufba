"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import * as v from "valibot";

import {
  databaseFailure,
  mapAddRpcResult,
  mapReportRpcResult,
  parseReportRpcRow,
  type AddLinkActionResult,
  type ReportLinkActionResult,
  type TurmaActionFailure,
} from "@/features/turmas/action-results";
import {
  REPORT_REASON_MAX_LENGTH,
  REPORT_REASON_MIN_LENGTH,
} from "@/features/turmas/constants";
import { captureUnexpectedError } from "@/lib/observability/capture-unexpected-error";
import { getIdSuffix, writeSafeLog } from "@/lib/observability/safe-logger";
import { createAbuseFingerprint } from "@/lib/security/abuse-fingerprint";
import { createClient } from "@/lib/supabase/server";

const WHATSAPP_INVITE_REGEX =
  /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+\/?$/;

const honeypotSchema = v.optional(
  v.pipe(v.string(), v.maxLength(200, "Dados inválidos.")),
  "",
);

const adicionarLinkSchema = v.object({
  turmaId: v.pipe(v.string(), v.uuid("Turma inválida.")),
  url: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Informe o link do grupo."),
    v.regex(
      WHATSAPP_INVITE_REGEX,
      "O link deve começar com https://chat.whatsapp.com/",
    ),
  ),
  contactReference: honeypotSchema,
});

const denunciarLinkSchema = v.object({
  linkId: v.pipe(v.string(), v.uuid("Link inválido.")),
  motivo: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(
      REPORT_REASON_MIN_LENGTH,
      `Informe um motivo com pelo menos ${REPORT_REASON_MIN_LENGTH} caracteres.`,
    ),
    v.maxLength(
      REPORT_REASON_MAX_LENGTH,
      `O motivo deve ter no máximo ${REPORT_REASON_MAX_LENGTH} caracteres.`,
    ),
  ),
  contactReference: honeypotSchema,
});

function validationFailure(message: string): TurmaActionFailure {
  return { ok: false, code: "VALIDATION_ERROR", message };
}

function honeypotFailure(): TurmaActionFailure {
  writeSafeLog("warn", {
    event: "public_form_rejected",
    code: "HONEYPOT_TRIGGERED",
    environment: process.env.CONTEXT ?? process.env.NODE_ENV,
  });

  return {
    ok: false,
    code: "HONEYPOT_TRIGGERED",
    message: "Não foi possível concluir a solicitação.",
  };
}

async function getFingerprint(
  actionScope: "add_link" | "report_link",
): Promise<string | null> {
  const headerStore = await headers();
  const result = createAbuseFingerprint(headerStore, actionScope);

  if (result.ok) return result.fingerprint;

  captureUnexpectedError(new Error(`Abuse protection ${result.code}`), {
    operation: `abuse-fingerprint.${actionScope}`,
    subsystem: "security",
    tags: { code: result.code },
  });
  writeSafeLog("error", {
    event: "abuse_fingerprint_unavailable",
    code: result.code,
    environment: process.env.CONTEXT ?? process.env.NODE_ENV,
  });

  return null;
}

export async function adicionarLink(
  turmaId: string,
  url: string,
  contactReference = "",
): Promise<AddLinkActionResult> {
  const parsed = v.safeParse(adicionarLinkSchema, {
    turmaId,
    url,
    contactReference,
  });

  if (!parsed.success) {
    return validationFailure(parsed.issues[0]?.message ?? "Dados inválidos.");
  }

  if (parsed.output.contactReference.trim()) return honeypotFailure();

  const fingerprint = await getFingerprint("add_link");
  if (!fingerprint) {
    return {
      ok: false,
      code: "CONFIGURATION_ERROR",
      message: "Não foi possível concluir agora. Tente novamente mais tarde.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("add_link_secure", {
      p_turma_id: parsed.output.turmaId,
      p_url_whatsapp: parsed.output.url,
      p_reporter_fingerprint: fingerprint,
    } as any);

    if (error) {
      if (error.code !== "22023") {
        captureUnexpectedError(error, {
          operation: "adicionarLink.rpc",
          subsystem: "supabase",
          tags: { database_error_code: error.code || "unknown" },
        });
      }
      writeSafeLog("error", {
        event: "add_link_failed",
        code: error.code || "DATABASE_ERROR",
        resourceIdSuffix: getIdSuffix(parsed.output.turmaId),
        environment: process.env.CONTEXT ?? process.env.NODE_ENV,
      });
      return databaseFailure(
        "Não foi possível adicionar o link. Tente novamente.",
      );
    }

    const result = mapAddRpcResult(data);
    if (result.ok) revalidatePath("/");
    return result;
  } catch (error) {
    captureUnexpectedError(error, {
      operation: "adicionarLink",
      subsystem: "server-action",
    });
    writeSafeLog("error", {
      event: "add_link_failed",
      code: "UNEXPECTED_ERROR",
      resourceIdSuffix: getIdSuffix(parsed.output.turmaId),
      environment: process.env.CONTEXT ?? process.env.NODE_ENV,
    });
    return databaseFailure(
      "Não foi possível adicionar o link. Tente novamente.",
    );
  }
}

export async function denunciarLink(
  linkId: string,
  motivo: string,
  contactReference = "",
): Promise<ReportLinkActionResult> {
  const parsed = v.safeParse(denunciarLinkSchema, {
    linkId,
    motivo,
    contactReference,
  });

  if (!parsed.success) {
    return validationFailure(parsed.issues[0]?.message ?? "Dados inválidos.");
  }

  if (parsed.output.contactReference.trim()) return honeypotFailure();

  const fingerprint = await getFingerprint("report_link");
  if (!fingerprint) {
    return {
      ok: false,
      code: "CONFIGURATION_ERROR",
      message: "Não foi possível concluir agora. Tente novamente mais tarde.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("report_link_secure", {
      p_link_id: parsed.output.linkId,
      p_motivo: parsed.output.motivo,
      p_reporter_fingerprint: fingerprint,
    } as any);

    if (error) {
      if (error.code !== "22023") {
        captureUnexpectedError(error, {
          operation: "denunciarLink.rpc",
          subsystem: "supabase",
          tags: { database_error_code: error.code || "unknown" },
        });
      }
      writeSafeLog("error", {
        event: "report_link_failed",
        code: error.code || "DATABASE_ERROR",
        resourceIdSuffix: getIdSuffix(parsed.output.linkId),
        environment: process.env.CONTEXT ?? process.env.NODE_ENV,
      });
      return databaseFailure(
        "Não foi possível registrar a denúncia. Tente novamente.",
      );
    }

    const row = parseReportRpcRow(data);
    if (!row) {
      captureUnexpectedError(new Error("Invalid report RPC response"), {
        operation: "denunciarLink.response",
        subsystem: "supabase",
      });
      return databaseFailure(
        "Não foi possível registrar a denúncia. Tente novamente.",
      );
    }

    const result = mapReportRpcResult(row);
    if (result.ok) revalidatePath("/");
    return result;
  } catch (error) {
    captureUnexpectedError(error, {
      operation: "denunciarLink",
      subsystem: "server-action",
    });
    writeSafeLog("error", {
      event: "report_link_failed",
      code: "UNEXPECTED_ERROR",
      resourceIdSuffix: getIdSuffix(parsed.output.linkId),
      environment: process.env.CONTEXT ?? process.env.NODE_ENV,
    });
    return databaseFailure(
      "Não foi possível registrar a denúncia. Tente novamente.",
    );
  }
}
