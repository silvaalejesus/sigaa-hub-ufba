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
import { sendLinkVerificationEmail } from "@/lib/email/resend";
import {
  buildLinkEmailVerificationUrl,
  createLinkEmailVerificationToken,
  createVerificationEmailFingerprint,
} from "@/lib/security/link-email-verification";
import { validateTurnstileToken } from "@/lib/security/turnstile";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/privileged-server";
import { createAbuseFingerprint } from "@/lib/security/abuse-fingerprint";
import { createClient } from "@/lib/supabase/server";

const WHATSAPP_INVITE_REGEX =
  /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+\/?$/;

const honeypotSchema = v.optional(
  v.pipe(v.string(), v.maxLength(200, "Dados inválidos.")),
  "",
);

const adicionarLinkSchema = v.object({
  // sigaa-hub-link-notification-v1
  turmaId: v.pipe(v.string(), v.uuid("Turma inválida.")),
  nome: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Informe seu nome."),
    v.minLength(3, "Informe um nome com pelo menos 3 caracteres."),
    v.maxLength(100, "O nome deve ter no máximo 100 caracteres."),
  ),
  matricula: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Informe seu número de matrícula."),
    v.regex(/^\d{5,20}$/, "Informe uma matrícula contendo apenas números."),
  ),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Informe seu e-mail."),
    v.maxLength(254, "O e-mail deve ter no máximo 254 caracteres."),
    v.email("Informe um e-mail válido."),
  ),
  url: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Informe o link do grupo."),
    v.regex(
      WHATSAPP_INVITE_REGEX,
      "O link deve começar com https://chat.whatsapp.com/",
    ),
  ),
  turnstileToken: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Conclua a verificação antirobô."),
    v.maxLength(2048, "Verificação antirobô inválida."),
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
  nome: string,
  matricula: string,
  email: string,
  turnstileToken: string,
  contactReference = "",
): Promise<AddLinkActionResult> {
  const parsed = v.safeParse(adicionarLinkSchema, {
    turmaId,
    url,
    nome,
    matricula,
    email,
    turnstileToken,
    contactReference,
  });

  if (!parsed.success) {
    return validationFailure(parsed.issues[0]?.message ?? "Dados inválidos.");
  }

  if (parsed.output.contactReference.trim()) return honeypotFailure();

  const turnstile = await validateTurnstileToken(
    parsed.output.turnstileToken,
    "add_link",
  );

  if (!turnstile.ok) {
    writeSafeLog("warn", {
      event: "turnstile_validation_failed",
      code: turnstile.code,
      resourceIdSuffix: getIdSuffix(parsed.output.turmaId),
      environment: process.env.CONTEXT ?? process.env.NODE_ENV,
    });

    if (turnstile.code === "CONFIGURATION_ERROR") {
      return {
        ok: false,
        code: "CONFIGURATION_ERROR",
        message: "A verificação antirobô não está disponível agora.",
      };
    }

    return validationFailure(
      "Não foi possível validar a verificação antirobô. Tente novamente.",
    );
  }

  const fingerprint = await getFingerprint("add_link");
  if (!fingerprint) {
    return {
      ok: false,
      code: "CONFIGURATION_ERROR",
      message: "Não foi possível concluir agora. Tente novamente mais tarde.",
    };
  }

  try {
    const emailFingerprint = createVerificationEmailFingerprint(
      parsed.output.email,
    );
    const privilegedSupabase = createPrivilegedSupabaseClient();

    const { data, error } = await privilegedSupabase.rpc(
      "request_link_email_verification_secure",
      {
        p_turma_id: parsed.output.turmaId,
        p_url_whatsapp: parsed.output.url,
        p_reporter_fingerprint: fingerprint,
        p_email_fingerprint: emailFingerprint,
      },
    );

    if (error) {
      writeSafeLog("error", {
        event: "link_verification_request_failed",
        code: error.code || "DATABASE_ERROR",
        resourceIdSuffix: getIdSuffix(parsed.output.turmaId),
        environment: process.env.CONTEXT ?? process.env.NODE_ENV,
      });
      return databaseFailure(
        "Não foi possível preparar a confirmação do e-mail. Tente novamente.",
      );
    }

    const rpcStatus = typeof data === "string" ? data : String(data ?? "");

    if (rpcStatus !== "verification_allowed") {
      return mapAddRpcResult(rpcStatus);
    }

    const verificationToken = createLinkEmailVerificationToken({
      turmaId: parsed.output.turmaId,
      url: parsed.output.url,
      nome: parsed.output.nome,
      matricula: parsed.output.matricula,
      email: parsed.output.email,
      fingerprint,
    });

    const verificationUrl = buildLinkEmailVerificationUrl(verificationToken);

    const emailResult = await sendLinkVerificationEmail({
      to: parsed.output.email,
      name: parsed.output.nome,
      verificationUrl,
    });

    if (!emailResult.ok) {
      writeSafeLog("warn", {
        event: "link_verification_email_failed",
        code: emailResult.code,
        resourceIdSuffix: getIdSuffix(parsed.output.turmaId),
        environment: process.env.CONTEXT ?? process.env.NODE_ENV,
      });

      return databaseFailure(
        "Não foi possível enviar o e-mail de confirmação. Tente novamente.",
      );
    }

    const successResult = mapAddRpcResult("added");
    if (!successResult.ok) {
      return databaseFailure(
        "O e-mail foi enviado, mas não foi possível concluir a resposta.",
      );
    }

    return {
      ...successResult,
      message:
        "Enviamos um e-mail de confirmação. O grupo só será publicado após a confirmação.",
    };
  } catch {
    writeSafeLog("error", {
      event: "link_verification_request_failed",
      code: "UNEXPECTED_ERROR",
      resourceIdSuffix: getIdSuffix(parsed.output.turmaId),
      environment: process.env.CONTEXT ?? process.env.NODE_ENV,
    });
    return databaseFailure(
      "Não foi possível enviar o e-mail de confirmação. Tente novamente.",
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
