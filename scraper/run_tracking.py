"""Registro seguro e tolerante a falhas das execuções do scraper no Supabase."""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, Optional

if TYPE_CHECKING:
    from supabase import Client

ALLOWED_TRIGGER_SOURCES = {"manual", "github_actions", "local", "scheduled"}
MAX_ERROR_MESSAGE_LENGTH = 1000
DEFAULT_STATE_FILE = Path(__file__).with_name(".scraper_run_state.json")
SAFE_VALUE_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
GITHUB_SHA_RE = re.compile(r"^[0-9a-fA-F]{7,64}$")
JWT_RE = re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b")
CREDENTIAL_RE = re.compile(
    r"(?i)\b(authorization|apikey|api[-_ ]?key|token|secret|password)"
    r"\s*[:=]\s*([^\s,;]+)"
)
BEARER_RE = re.compile(r"(?i)\bbearer\s+[^\s,;]+")
URL_CREDENTIAL_RE = re.compile(r"(https?://)([^/@\s:]+):([^/@\s]+)@", re.IGNORECASE)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_state_file() -> Path:
    configured = os.getenv("SCRAPER_RUN_STATE_FILE")
    return Path(configured) if configured else DEFAULT_STATE_FILE


def normalize_trigger_source(value: Optional[str] = None) -> str:
    candidate = (value or os.getenv("SCRAPER_TRIGGER_SOURCE") or "").strip().lower()

    if candidate in ALLOWED_TRIGGER_SOURCES:
        return candidate

    if os.getenv("GITHUB_ACTIONS", "").lower() == "true":
        if os.getenv("GITHUB_EVENT_NAME", "").lower() == "schedule":
            return "scheduled"
        return "github_actions"

    return "local"


def sanitize_error_message(error: BaseException | str) -> str:
    message = str(error)

    for variable_name in (
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SENTRY_DSN",
        "SENTRY_AUTH_TOKEN",
    ):
        secret = os.getenv(variable_name)
        if secret:
            message = message.replace(secret, "[REDACTED]")

    message = JWT_RE.sub("[REDACTED_JWT]", message)
    message = BEARER_RE.sub("Bearer [REDACTED]", message)
    message = CREDENTIAL_RE.sub(r"\1=[REDACTED]", message)
    message = URL_CREDENTIAL_RE.sub(r"\1[REDACTED]@", message)
    message = " ".join(message.split())

    if not message:
        message = "Erro sem mensagem disponível."

    return message[:MAX_ERROR_MESSAGE_LENGTH]


def stable_error_code(error: BaseException) -> str:
    class_name = error.__class__.__name__ or "UnknownError"
    snake_case = re.sub(r"(?<!^)(?=[A-Z])", "_", class_name).upper()
    sanitized = re.sub(r"[^A-Z0-9_]+", "_", snake_case).strip("_")
    return (sanitized or "UNKNOWN_ERROR")[:80]


def capture_unexpected_exception(error: BaseException) -> None:
    """Usa o Sentry do scraper quando o SDK já estiver disponível/configurado."""

    try:
        import sentry_sdk  # type: ignore[import-not-found]

        sentry_sdk.capture_exception(error)
    except Exception:
        # Observabilidade nunca pode alterar o exit code nem ocultar a falha original.
        return


def _safe_env_value(name: str, pattern: re.Pattern[str] = SAFE_VALUE_RE) -> Optional[str]:
    value = (os.getenv(name) or "").strip()
    return value if value and pattern.fullmatch(value) else None


def _safe_nonnegative_int(value: Any) -> int:
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError, OverflowError):
        return 0


def build_safe_metadata(
    *,
    phase: str,
    departments_failed: Optional[int] = None,
) -> Dict[str, Any]:
    metadata: Dict[str, Any] = {
        "phase": phase,
        "scraper_version": _safe_env_value("SCRAPER_VERSION") or "1",
    }

    github_sha = _safe_env_value("GITHUB_SHA", GITHUB_SHA_RE)
    github_run_id = _safe_env_value("GITHUB_RUN_ID", re.compile(r"^[0-9]{1,32}$"))
    github_run_number = _safe_env_value(
        "GITHUB_RUN_NUMBER", re.compile(r"^[0-9]{1,16}$")
    )

    if github_sha:
        metadata["commit_sha"] = github_sha
    if github_run_id:
        metadata["workflow_run_id"] = github_run_id
    if github_run_number:
        metadata["workflow_run_number"] = github_run_number
    if departments_failed is not None:
        metadata["departments_failed"] = _safe_nonnegative_int(departments_failed)

    return metadata


def _get_client() -> "Client":
    from supabase import create_client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias para registrar a execução."
        )

    return create_client(url, key)


def _log_telemetry_failure(operation: str, error: BaseException) -> None:
    logging.error(
        "Falha ao registrar telemetria do scraper na etapa '%s'. A execução principal será preservada.",
        operation,
    )
    capture_unexpected_exception(error)


def _write_state(run_id: str, semester: Optional[str]) -> None:
    path = get_state_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(f"{path.suffix}.tmp")
    temporary_path.write_text(
        json.dumps({"run_id": run_id, "semester": semester}),
        encoding="utf-8",
    )
    temporary_path.replace(path)


def load_run_state() -> Dict[str, Optional[str]]:
    path = get_state_file()

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {"run_id": None, "semester": None}

    run_id = data.get("run_id") if isinstance(data, dict) else None
    semester = data.get("semester") if isinstance(data, dict) else None

    return {
        "run_id": run_id if isinstance(run_id, str) and run_id else None,
        "semester": semester if isinstance(semester, str) and semester else None,
    }


def clear_run_state() -> None:
    try:
        get_state_file().unlink(missing_ok=True)
    except OSError as error:
        _log_telemetry_failure("clear_state", error)


def start_scraper_run(semester: Optional[str]) -> Optional[str]:
    try:
        response = (
            _get_client()
            .table("scraper_runs")
            .insert(
                {
                    "status": "running",
                    "trigger_source": normalize_trigger_source(),
                    "semester": semester,
                    "started_at": utc_now_iso(),
                    "metadata": build_safe_metadata(phase="started"),
                }
            )
            .execute()
        )
        rows = response.data or []
        run_id = rows[0].get("id") if rows and isinstance(rows[0], dict) else None

        if not isinstance(run_id, str) or not run_id:
            raise RuntimeError("Supabase não retornou o ID da execução do scraper.")

        _write_state(run_id, semester)
        return run_id
    except Exception as error:
        _log_telemetry_failure("start", error)
        return None


def _update_run(run_id: str, values: Dict[str, Any], operation: str) -> bool:
    try:
        _get_client().table("scraper_runs").update(values).eq("id", run_id).execute()
        return True
    except Exception as error:
        _log_telemetry_failure(operation, error)
        return False


def record_extraction_summary(run_id: Optional[str], payload: Dict[str, Any]) -> None:
    if not run_id:
        return

    metadata = payload.get("metadata")
    safe_metadata = metadata if isinstance(metadata, dict) else {}
    departments_failed = _safe_nonnegative_int(
        safe_metadata.get("total_unidades_com_erro")
    )

    _update_run(
        run_id,
        {
            "semester": safe_metadata.get("semestre"),
            "departments_processed": _safe_nonnegative_int(
                safe_metadata.get("total_unidades_processadas")
            ),
            "subjects_found": _safe_nonnegative_int(
                safe_metadata.get("total_disciplinas")
            ),
            "classes_found": _safe_nonnegative_int(
                safe_metadata.get("total_turmas")
            ),
            "metadata": build_safe_metadata(
                phase="extraction_complete",
                departments_failed=departments_failed,
            ),
        },
        "extraction_summary",
    )


def determine_final_status(payload: Dict[str, Any]) -> str:
    metadata = payload.get("metadata")
    values = metadata if isinstance(metadata, dict) else {}
    total_departments = _safe_nonnegative_int(
        values.get("total_unidades_encontradas")
    )
    processed_departments = _safe_nonnegative_int(
        values.get("total_unidades_processadas")
    )
    failed_departments = _safe_nonnegative_int(
        values.get("total_unidades_com_erro")
    )

    if total_departments > 0 and processed_departments == 0:
        return "failed"
    if failed_departments > 0:
        return "partial"
    return "success"


def finish_scraper_run(
    run_id: Optional[str],
    payload: Dict[str, Any],
    *,
    subjects_upserted: int,
    classes_upserted: int,
) -> str:
    metadata = payload.get("metadata")
    safe_metadata = metadata if isinstance(metadata, dict) else {}
    final_status = determine_final_status(payload)
    departments_failed = _safe_nonnegative_int(
        safe_metadata.get("total_unidades_com_erro")
    )

    if not run_id:
        return final_status

    updated = _update_run(
        run_id,
        {
            "status": final_status,
            "semester": safe_metadata.get("semestre"),
            "finished_at": utc_now_iso(),
            "departments_processed": _safe_nonnegative_int(
                safe_metadata.get("total_unidades_processadas")
            ),
            "subjects_found": _safe_nonnegative_int(
                safe_metadata.get("total_disciplinas")
            ),
            "classes_found": _safe_nonnegative_int(
                safe_metadata.get("total_turmas")
            ),
            "subjects_upserted": _safe_nonnegative_int(subjects_upserted),
            "classes_upserted": _safe_nonnegative_int(classes_upserted),
            "error_code": None,
            "error_message": None,
            "metadata": build_safe_metadata(
                phase="synchronization_complete",
                departments_failed=departments_failed,
            ),
        },
        "finish",
    )

    if updated:
        clear_run_state()

    return final_status


def fail_scraper_run(
    run_id: Optional[str],
    error: BaseException,
    *,
    phase: str,
) -> None:
    if not run_id:
        return

    updated = _update_run(
        run_id,
        {
            "status": "failed",
            "finished_at": utc_now_iso(),
            "error_code": stable_error_code(error),
            "error_message": sanitize_error_message(error),
            "metadata": build_safe_metadata(phase=phase),
        },
        "fail",
    )

    if updated:
        clear_run_state()
