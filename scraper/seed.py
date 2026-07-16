#!/usr/bin/env python3
"""
SIGAA Hub - Importador JSON -> Supabase

Lê `dados.json` e popula:
- public.disciplinas
- public.turmas

Idempotência:
- disciplinas: upsert por codigo
- turmas: upsert por disciplina_id + codigo_turma + semestre

Variáveis de ambiente:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Use a service_role key apenas em ambiente local/backend/CI confiável.
Nunca exponha essa chave no front-end Next.js.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from supabase import Client, create_client
from run_tracking import (
    capture_unexpected_exception,
    fail_scraper_run,
    finish_scraper_run,
    load_run_state,
    sanitize_error_message,
    start_scraper_run,
)

DEFAULT_INPUT_CANDIDATES = ("dados.json", "dados_sigaa.json")
DEFAULT_BATCH_SIZE = 200


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).strip().split())


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Variável de ambiente obrigatória ausente: {name}")
    return value


def chunked(items: List[Dict[str, Any]], size: int) -> Iterable[List[Dict[str, Any]]]:
    for index in range(0, len(items), size):
        yield items[index : index + size]


def load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {path}")

    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, dict):
        raise ValueError("O JSON precisa ser um objeto com as chaves 'disciplinas' e 'turmas'.")

    data.setdefault("disciplinas", [])
    data.setdefault("turmas", [])

    if not isinstance(data["disciplinas"], list):
        raise ValueError("A chave 'disciplinas' precisa ser uma lista.")

    if not isinstance(data["turmas"], list):
        raise ValueError("A chave 'turmas' precisa ser uma lista.")

    return data


def resolve_default_input() -> Path:
    for candidate in DEFAULT_INPUT_CANDIDATES:
        path = Path(candidate)
        if path.exists():
            return path

    return Path("dados.json")


def normalize_disciplina(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    codigo = clean_text(raw.get("codigo")).upper()
    nome = clean_text(raw.get("nome"))
    departamento = clean_text(raw.get("departamento"))

    if not codigo or not nome:
        return None

    return {
        "codigo": codigo,
        "nome": nome,
        "departamento": departamento or None,
    }


def normalize_turma(
    raw: Dict[str, Any],
    disciplina_id_by_codigo: Dict[str, str],
    *,
    include_horario: bool = False,
) -> Optional[Dict[str, Any]]:
    disciplina_codigo = clean_text(
        raw.get("disciplina_codigo")
        or raw.get("codigo_disciplina")
        or raw.get("codigo")
    ).upper()

    codigo_turma = clean_text(
        raw.get("codigo_turma")
        or raw.get("turma")
    ).upper()

    professor = clean_text(
        raw.get("professor")
        or raw.get("docente")
    )

    semestre = clean_text(raw.get("semestre"))

    if not disciplina_codigo or not codigo_turma or not semestre:
        return None

    disciplina_id = disciplina_id_by_codigo.get(disciplina_codigo)
    if not disciplina_id:
        return None

    turma = {
        "disciplina_id": disciplina_id,
        "codigo_turma": codigo_turma,
        "professor": professor or None,
        "semestre": semestre,
    }

    # O schema SQL anterior não tinha coluna `horario`.
    # Ative apenas se você adicionou `horario text` em public.turmas.
    if include_horario:
        turma["horario"] = clean_text(raw.get("horario")) or None

    return turma


def dedupe_by_key(
    rows: List[Dict[str, Any]],
    key_fields: Tuple[str, ...],
) -> List[Dict[str, Any]]:
    indexed: Dict[Tuple[Any, ...], Dict[str, Any]] = {}

    for row in rows:
        key = tuple(row.get(field) for field in key_fields)
        indexed[key] = row

    return list(indexed.values())


def upsert_disciplinas(
    supabase: Client,
    disciplinas_raw: List[Dict[str, Any]],
    *,
    batch_size: int,
) -> Dict[str, str]:
    disciplinas: List[Dict[str, Any]] = []

    for raw in disciplinas_raw:
        normalized = normalize_disciplina(raw)
        if normalized:
            disciplinas.append(normalized)

    disciplinas = dedupe_by_key(disciplinas, ("codigo",))

    if not disciplinas:
        print("Nenhuma disciplina válida encontrada no JSON.")
        return {}

    print(f"Upsert de disciplinas: {len(disciplinas)} registro(s).")

    for batch in chunked(disciplinas, batch_size):
        (
            supabase
            .table("disciplinas")
            .upsert(batch, on_conflict="codigo")
            .execute()
        )

    codigos = [item["codigo"] for item in disciplinas]
    disciplina_id_by_codigo: Dict[str, str] = {}

    codigo_rows = [{"codigo": codigo} for codigo in codigos]

    for batch_codigos in chunked(codigo_rows, batch_size):
        codigos_lote = [item["codigo"] for item in batch_codigos]

        response = (
            supabase
            .table("disciplinas")
            .select("id,codigo")
            .in_("codigo", codigos_lote)
            .execute()
        )

        for row in response.data or []:
            disciplina_id_by_codigo[row["codigo"]] = row["id"]

    print(f"Disciplinas resolvidas com ID: {len(disciplina_id_by_codigo)}.")
    return disciplina_id_by_codigo


def upsert_turmas(
    supabase: Client,
    turmas_raw: List[Dict[str, Any]],
    disciplina_id_by_codigo: Dict[str, str],
    *,
    batch_size: int,
    include_horario: bool,
) -> int:
    turmas: List[Dict[str, Any]] = []
    skipped = 0

    for raw in turmas_raw:
        normalized = normalize_turma(
            raw,
            disciplina_id_by_codigo,
            include_horario=include_horario,
        )

        if normalized:
            turmas.append(normalized)
        else:
            skipped += 1

    turmas = dedupe_by_key(
        turmas,
        ("disciplina_id", "codigo_turma", "semestre"),
    )

    if not turmas:
        print("Nenhuma turma válida encontrada no JSON.")
        if skipped:
            print(f"Turmas ignoradas por dados insuficientes: {skipped}.")
        return 0

    print(f"Upsert de turmas: {len(turmas)} registro(s).")

    for batch in chunked(turmas, batch_size):
        (
            supabase
            .table("turmas")
            .upsert(
                batch,
                on_conflict="disciplina_id,codigo_turma,semestre",
            )
            .execute()
        )

    if skipped:
        print(f"Turmas ignoradas por dados insuficientes ou disciplina ausente: {skipped}.")

    return len(turmas)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Importa dados de turmas do SIGAA Hub para Supabase."
    )

    parser.add_argument(
        "--input",
        default=None,
        help="Caminho do JSON. Padrão: dados.json; fallback: dados_sigaa.json.",
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Tamanho dos lotes de upsert. Padrão: {DEFAULT_BATCH_SIZE}.",
    )

    parser.add_argument(
        "--include-horario",
        action="store_true",
        help=(
            "Inclui o campo horario no upsert de turmas. "
            "Use apenas se a coluna horario existir na tabela public.turmas."
        ),
    )

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input) if args.input else resolve_default_input()
    run_state = load_run_state()
    run_id = run_state.get("run_id")

    try:
        supabase_url = require_env("SUPABASE_URL")
        supabase_key = require_env("SUPABASE_SERVICE_ROLE_KEY")
        supabase = create_client(supabase_url, supabase_key)
        data = load_json(input_path)
        metadata = data.get("metadata")
        safe_metadata = metadata if isinstance(metadata, dict) else {}
        semester_value = safe_metadata.get("semestre")
        semester = semester_value if isinstance(semester_value, str) else None

        if not run_id:
            run_id = start_scraper_run(semester)

        print(f"Lendo arquivo: {input_path}")

        disciplina_id_by_codigo = upsert_disciplinas(
            supabase,
            data.get("disciplinas", []),
            batch_size=args.batch_size,
        )

        total_turmas = upsert_turmas(
            supabase,
            data.get("turmas", []),
            disciplina_id_by_codigo,
            batch_size=args.batch_size,
            include_horario=args.include_horario,
        )

        final_status = finish_scraper_run(
            run_id,
            data,
            subjects_upserted=len(disciplina_id_by_codigo),
            classes_upserted=total_turmas,
        )

        print("Importação concluída.")
        print(f"Status da execução: {final_status}")
        print(f"Total de disciplinas no lote: {len(disciplina_id_by_codigo)}")
        print(f"Total de turmas processadas no lote: {total_turmas}")

        if final_status == "failed":
            print(
                "A execução não processou o fluxo mínimo esperado.",
                file=sys.stderr,
            )
            return 1

        return 0
    except Exception as exc:
        fail_scraper_run(run_id, exc, phase="synchronization_failed")
        capture_unexpected_exception(exc)
        print(
            f"Erro na importação: {sanitize_error_message(exc)}",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
