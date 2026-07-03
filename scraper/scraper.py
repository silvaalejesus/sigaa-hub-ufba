#!/usr/bin/env python3
"""
SIGAA Hub - Scraper público de turmas UFBA

Versão multiunidade:
- Seleciona o nível de ensino.
- Lê todas as opções válidas do select de Unidades/Departamentos.
- Itera por todas as unidades.
- Extrai disciplinas e turmas por unidade.
- Agrega tudo em um único dados_sigaa.json.
- Continua a execução mesmo se uma unidade falhar.

Uso básico:
    python scraper.py --ano 2026 --periodo 1

Uso com navegador visível para depuração:
    python scraper.py --ano 2026 --periodo 1 --headful --slow-mo 300 --debug-html

Dependências:
    pip install playwright
    python -m playwright install chromium
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from playwright.sync_api import (
    Browser,
    BrowserContext,
    Page,
    TimeoutError as PlaywrightTimeoutError,
    sync_playwright,
)


SIGAA_TURMAS_URL = "https://sigaa.ufba.br/sigaa/public/turmas/listar.jsf?aba=p-ensino"
DEFAULT_NIVEL = "GRADUAÇÃO"

UNIDADE_KEYWORDS = (
    "DEPARTAMENTO",
    "INSTITUTO",
    "FACULDADE",
    "ESCOLA",
    "COLEGIADO",
    "SUPERINTENDÊNCIA",
    "CENTRO",
    "NÚCLEO",
    "CAMPUS",
)

IGNORED_OPTION_TEXTS = {
    "",
    "TODOS",
    "TODAS",
    "SELECIONE",
    "SELECIONE UMA OPÇÃO",
    "SELECIONE UMA OPCAO",
    "-- SELECIONE --",
    "--- SELECIONE ---",
    "TODOS OS DEPARTAMENTOS",
    "TODAS AS UNIDADES",
}

DISCIPLINA_RE = re.compile(
    r"\b([A-Z]{2,8}\d{2,4}[A-Z]?)\s*(?:-|–|—)\s*(.+)",
    re.IGNORECASE,
)

TURMA_RE = re.compile(
    r"^(?:T?\d{2}[A-Z]?|[A-Z]{1,2}\d{2}[A-Z]?|\d{6})$",
    re.IGNORECASE,
)

HORARIO_RE = re.compile(
    r"("
    r"\b[2-7][MTN]\d{1,4}\b|"
    r"\b[2-7][MTN]\b|"
    r"\b(?:SEG|TER|QUA|QUI|SEX|SAB|SÁB|DOM)\b|"
    r"\b\d{1,2}:\d{2}\b"
    r")",
    re.IGNORECASE,
)


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_key(value: Any) -> str:
    value = clean_text(value).lower()
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    return value


def is_irrelevant_option(text: str, value: str = "") -> bool:
    text_clean = clean_text(text)
    value_clean = clean_text(value)

    if not text_clean and not value_clean:
        return True

    text_key = normalize_key(text_clean)
    ignored_keys = {normalize_key(item) for item in IGNORED_OPTION_TEXTS}

    if text_key in ignored_keys:
        return True

    if text_key.startswith("selecione"):
        return True

    if text_key in {"todos", "todas"}:
        return True

    return False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extrai turmas públicas do SIGAA UFBA usando Playwright."
    )

    parser.add_argument("--ano", default="2026", help="Ano do semestre. Exemplo: 2026")
    parser.add_argument(
        "--periodo",
        default="1",
        choices=["1", "2", "3", "4"],
        help="Período acadêmico. Exemplo: 1 para 2026.1",
    )
    parser.add_argument("--nivel", default=DEFAULT_NIVEL, help="Nível de ensino. Exemplo: GRADUAÇÃO")
    parser.add_argument("--output", default="dados_sigaa.json", help="Arquivo JSON de saída.")
    parser.add_argument("--headful", action="store_true", help="Executa o navegador com interface visual.")
    parser.add_argument("--debug-html", action="store_true", help="Salva HTMLs de debug em ./debug_sigaa/.")
    parser.add_argument("--timeout", type=int, default=45_000, help="Timeout em milissegundos.")
    parser.add_argument("--slow-mo", type=int, default=0, help="Atraso em ms entre ações do Playwright.")
    parser.add_argument("--max-unidades", type=int, default=None, help="Limita unidades processadas para teste.")

    return parser.parse_args()


def safe_wait_networkidle(page: Page, timeout: int = 10_000) -> None:
    try:
        page.wait_for_load_state("networkidle", timeout=timeout)
    except PlaywrightTimeoutError:
        pass


def get_select_options(page: Page, select_index: int) -> List[Dict[str, str]]:
    return page.locator("select").nth(select_index).locator("option").evaluate_all(
        """
        options => options.map(option => ({
            text: (option.textContent || '').replace(/\\s+/g, ' ').trim(),
            value: option.value || ''
        }))
        """
    )


def select_option_by_text(
    page: Page,
    target_text: str,
    *,
    exact: bool = False,
    timeout: int = 45_000,
) -> str:
    """Seleciona uma opção em qualquer <select> pelo texto visível."""
    target_norm = normalize_key(target_text)

    page.wait_for_selector("select", timeout=timeout)
    selects = page.locator("select")
    total_selects = selects.count()

    for select_index in range(total_selects):
        select = selects.nth(select_index)

        try:
            if not select.is_visible():
                continue

            options = get_select_options(page, select_index)

            for option in options:
                option_text = clean_text(option["text"])
                option_norm = normalize_key(option_text)

                if exact:
                    matched = option_norm == target_norm
                else:
                    matched = target_norm in option_norm or option_norm in target_norm

                if matched:
                    select.select_option(value=option["value"])
                    safe_wait_networkidle(page)
                    logging.info("Selecionado: %s", option_text)
                    return option_text

        except Exception as exc:
            logging.warning("Falha ao avaliar select #%s: %s", select_index, exc)

    raise RuntimeError(f"Não encontrei opção compatível com: {target_text!r}")


def fill_first_visible_text_input(page: Page, value: str, *, timeout: int = 45_000) -> None:
    """Preenche o primeiro input textual visível, geralmente o campo de ano."""
    selector = "input[type='text'], input:not([type]), input[type='search']"

    page.wait_for_selector(selector, timeout=timeout)
    inputs = page.locator(selector)
    total_inputs = inputs.count()

    for index in range(total_inputs):
        input_el = inputs.nth(index)

        try:
            if input_el.is_visible() and input_el.is_enabled():
                input_el.fill(value)
                logging.info("Ano preenchido: %s", value)
                return
        except Exception as exc:
            logging.warning("Falha ao preencher input #%s: %s", index, exc)

    raise RuntimeError("Não encontrei input textual visível para preencher o ano.")


def score_unidade_select(options: List[Dict[str, str]]) -> int:
    """Pontua um <select> para descobrir qual representa Unidades/Departamentos."""
    valid_options = [
        option
        for option in options
        if not is_irrelevant_option(option.get("text", ""), option.get("value", ""))
    ]

    if len(valid_options) < 3:
        return 0

    score = len(valid_options)

    for option in valid_options:
        text = clean_text(option.get("text", "")).upper()

        if "/" in text:
            score += 3

        if any(keyword in text for keyword in UNIDADE_KEYWORDS):
            score += 5

    return score


def find_unidade_select(page: Page, *, timeout: int = 45_000) -> Tuple[int, List[Dict[str, str]]]:
    """Localiza o select de Unidades/Departamentos."""
    page.wait_for_selector("select", timeout=timeout)
    selects = page.locator("select")
    total_selects = selects.count()

    best_index = -1
    best_score = 0
    best_options: List[Dict[str, str]] = []

    for select_index in range(total_selects):
        try:
            select = selects.nth(select_index)

            if not select.is_visible():
                continue

            options = get_select_options(page, select_index)
            score = score_unidade_select(options)

            if score > best_score:
                best_index = select_index
                best_score = score
                best_options = options

        except Exception as exc:
            logging.warning("Não foi possível avaliar select #%s como unidade: %s", select_index, exc)

    valid_options = [
        {
            "text": clean_text(option.get("text", "")),
            "value": clean_text(option.get("value", "")),
        }
        for option in best_options
        if not is_irrelevant_option(option.get("text", ""), option.get("value", ""))
    ]

    if best_index < 0 or not valid_options:
        raise RuntimeError("Não foi possível localizar o select de Unidades/Departamentos.")

    logging.info(
        "Select de unidades encontrado no índice %s com %s opção(ões) válidas.",
        best_index,
        len(valid_options),
    )

    return best_index, valid_options


def select_unidade(page: Page, unidade: Dict[str, str], *, timeout: int = 45_000) -> str:
    """Seleciona uma unidade; recalcula o select porque o JSF pode recriar o DOM."""
    select_index, current_options = find_unidade_select(page, timeout=timeout)

    target_text = normalize_key(unidade["text"])
    target_value = clean_text(unidade["value"])

    select = page.locator("select").nth(select_index)

    if target_value:
        for option in current_options:
            if clean_text(option["value"]) == target_value:
                select.select_option(value=target_value)
                safe_wait_networkidle(page)
                return option["text"]

    for option in current_options:
        if normalize_key(option["text"]) == target_text:
            select.select_option(value=option["value"])
            safe_wait_networkidle(page)
            return option["text"]

    raise RuntimeError(f"Unidade não encontrada no formulário atual: {unidade['text']}")


def click_buscar(page: Page, *, timeout: int = 45_000) -> None:
    """Clica no botão Buscar e aguarda navegação ou atualização JSF."""
    button = page.get_by_role("button", name=re.compile(r"buscar", re.IGNORECASE)).first

    try:
        button.wait_for(state="visible", timeout=timeout)

        try:
            with page.expect_navigation(wait_until="networkidle", timeout=timeout):
                button.click()
        except PlaywrightTimeoutError:
            logging.info("Sem navegação completa após Buscar; aguardando atualização do DOM.")
            safe_wait_networkidle(page)

    except Exception as exc:
        raise RuntimeError(f"Não foi possível clicar em Buscar: {exc}") from exc


def wait_for_results(page: Page, *, timeout: int = 45_000) -> None:
    """Aguarda indício de resultado, tabela vazia ou mensagem do SIGAA."""
    try:
        page.wait_for_function(
            """
            () => {
                const text = document.body.innerText || '';
                const rows = document.querySelectorAll('table tr').length;
                const hasKnownTerms =
                    text.includes('Turma') ||
                    text.includes('Docente') ||
                    text.includes('Horário') ||
                    text.includes('Horario') ||
                    text.includes('Nenhum') ||
                    text.includes('nenhum') ||
                    text.includes('Componente Curricular');
                return rows > 3 && hasKnownTerms;
            }
            """,
            timeout=timeout,
        )
    except PlaywrightTimeoutError:
        logging.warning("Timeout aguardando resultados; tentando extrair mesmo assim.")


def extract_table_rows(page: Page) -> List[Dict[str, Any]]:
    """Extrai todas as linhas de tabelas HTML da página final."""
    return page.locator("table tr").evaluate_all(
        """
        rows => rows.map(row => ({
            text: (row.innerText || '').replace(/\\s+/g, ' ').trim(),
            className: row.className || '',
            cells: Array.from(row.querySelectorAll('th, td')).map(cell => ({
                text: (cell.innerText || '').replace(/\\s+/g, ' ').trim(),
                tag: cell.tagName.toLowerCase(),
                colspan: cell.getAttribute('colspan') || '1',
                className: cell.className || ''
            }))
        })).filter(row => row.text && row.cells.length > 0)
        """
    )


def parse_disciplina_from_text(text: str) -> Optional[Tuple[str, str]]:
    text = clean_text(text)
    text = re.sub(
        r"^(componente curricular|disciplina)\s*:?\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    match = DISCIPLINA_RE.search(text)
    if not match:
        return None

    codigo = match.group(1).upper().strip()
    nome = clean_text(match.group(2))

    nome = re.split(
        r"\b(?:Turma|Hor[aá]rio|Docente|Professor|Vagas|Local)\b",
        nome,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]

    nome = clean_text(nome)

    if not codigo or not nome:
        return None

    return codigo, nome


def is_turma_code(value: str) -> bool:
    return bool(TURMA_RE.match(clean_text(value).upper()))


def looks_like_schedule(value: str) -> bool:
    return bool(HORARIO_RE.search(clean_text(value)))


def detect_header_map(cells: List[str]) -> Dict[str, int]:
    header_map: Dict[str, int] = {}

    for index, cell in enumerate(cells):
        key = normalize_key(cell)

        if "turma" in key:
            header_map["turma"] = index

        if "horario" in key:
            header_map["horario"] = index

        if "docente" in key or "professor" in key:
            header_map["docente"] = index

    has_useful_header = "turma" in header_map and (
        "docente" in header_map or "horario" in header_map
    )

    return header_map if has_useful_header else {}


def safe_get(cells: List[str], index: Optional[int]) -> str:
    if index is None:
        return ""
    if index < 0 or index >= len(cells):
        return ""
    return clean_text(cells[index])


def extract_turma_from_cells(cells: List[str], header_map: Dict[str, int]) -> Optional[Dict[str, str]]:
    if not cells:
        return None

    turma = ""
    professor = ""
    horario = ""
    turma_index: Optional[int] = None

    if header_map:
        turma = safe_get(cells, header_map.get("turma"))
        professor = safe_get(cells, header_map.get("docente"))
        horario = safe_get(cells, header_map.get("horario"))
        turma_index = header_map.get("turma")

    if not turma or not is_turma_code(turma):
        for index, cell in enumerate(cells):
            if is_turma_code(cell):
                turma = clean_text(cell).upper()
                turma_index = index
                break

    if not turma or not is_turma_code(turma):
        return None

    if not horario:
        for cell in cells:
            if looks_like_schedule(cell):
                horario = clean_text(cell)
                break

    if not professor:
        ignored = {normalize_key(turma), normalize_key(horario)}
        candidates: List[str] = []

        for index, cell in enumerate(cells):
            cell_clean = clean_text(cell)
            cell_key = normalize_key(cell_clean)

            if not cell_clean:
                continue

            if cell_key in ignored:
                continue

            if is_turma_code(cell_clean):
                continue

            if looks_like_schedule(cell_clean):
                continue

            if any(term in cell_key for term in ["turma", "horario", "docente", "vagas"]):
                continue

            if parse_disciplina_from_text(cell_clean):
                continue

            if turma_index is None or index > turma_index:
                candidates.append(cell_clean)

        if candidates:
            candidates = sorted(candidates, key=len, reverse=True)
            professor = candidates[0]

    return {
        "codigo_turma": turma,
        "professor": professor or "DOCENTE NÃO INFORMADO",
        "horario": horario,
    }


def parse_sigaa_rows(
    rows: List[Dict[str, Any]],
    *,
    semestre: str,
    departamento: str,
) -> Dict[str, List[Dict[str, str]]]:
    disciplinas_by_codigo: Dict[str, Dict[str, str]] = {}
    turmas: List[Dict[str, str]] = []

    seen_turmas = set()
    current_disciplina: Optional[Tuple[str, str]] = None
    header_map: Dict[str, int] = {}

    for row in rows:
        try:
            cells = [clean_text(cell["text"]) for cell in row.get("cells", [])]
            row_text = clean_text(row.get("text", ""))

            if not row_text or not cells:
                continue

            possible_header = detect_header_map(cells)
            if possible_header:
                header_map = possible_header
                continue

            disciplina = parse_disciplina_from_text(row_text)
            if disciplina:
                current_disciplina = disciplina
                codigo, nome = disciplina

                disciplinas_by_codigo.setdefault(
                    codigo,
                    {
                        "codigo": codigo,
                        "nome": nome,
                        "departamento": departamento,
                    },
                )

            if not current_disciplina:
                continue

            turma_data = extract_turma_from_cells(cells, header_map)
            if not turma_data:
                continue

            disciplina_codigo, _disciplina_nome = current_disciplina

            turma_record = {
                "disciplina_codigo": disciplina_codigo,
                "codigo_turma": turma_data["codigo_turma"],
                "professor": turma_data["professor"],
                "semestre": semestre,
                "horario": turma_data["horario"],
                "departamento": departamento,
            }

            unique_key = (
                turma_record["disciplina_codigo"],
                turma_record["codigo_turma"],
                turma_record["semestre"],
            )

            if unique_key not in seen_turmas:
                seen_turmas.add(unique_key)
                turmas.append(turma_record)

        except Exception as exc:
            logging.warning("Falha ao processar linha da tabela: %s", exc)

    return {
        "disciplinas": sorted(disciplinas_by_codigo.values(), key=lambda item: item["codigo"]),
        "turmas": sorted(
            turmas,
            key=lambda item: (
                item["disciplina_codigo"],
                item["codigo_turma"],
                item["professor"],
            ),
        ),
    }


def merge_results(aggregate: Dict[str, Any], partial: Dict[str, List[Dict[str, str]]]) -> None:
    disciplinas_by_codigo: Dict[str, Dict[str, str]] = aggregate["_disciplinas_by_codigo"]
    turmas_by_key: Dict[Tuple[str, str, str], Dict[str, str]] = aggregate["_turmas_by_key"]

    for disciplina in partial["disciplinas"]:
        codigo = disciplina["codigo"]

        if codigo not in disciplinas_by_codigo:
            disciplinas_by_codigo[codigo] = disciplina
        else:
            existing = disciplinas_by_codigo[codigo]
            if not existing.get("departamento") and disciplina.get("departamento"):
                existing["departamento"] = disciplina["departamento"]

    for turma in partial["turmas"]:
        key = (
            turma["disciplina_codigo"],
            turma["codigo_turma"],
            turma["semestre"],
        )

        if key not in turmas_by_key:
            turmas_by_key[key] = turma
        else:
            existing = turmas_by_key[key]
            for field in ("professor", "horario", "departamento"):
                if not existing.get(field) and turma.get(field):
                    existing[field] = turma[field]


def prepare_form(page: Page, args: argparse.Namespace) -> None:
    """Abre o formulário limpo e aplica filtros fixos: nível, ano e período."""
    page.goto(SIGAA_TURMAS_URL, wait_until="domcontentloaded", timeout=args.timeout)
    safe_wait_networkidle(page)

    select_option_by_text(page, args.nivel, exact=True, timeout=args.timeout)
    safe_wait_networkidle(page)

    fill_first_visible_text_input(page, args.ano, timeout=args.timeout)
    select_option_by_text(page, args.periodo, exact=True, timeout=args.timeout)


def discover_unidades(page: Page, args: argparse.Namespace) -> List[Dict[str, str]]:
    logging.info("Descobrindo unidades disponíveis para o nível: %s", args.nivel)

    prepare_form(page, args)
    _select_index, unidades = find_unidade_select(page, timeout=args.timeout)

    seen = set()
    unique_unidades: List[Dict[str, str]] = []

    for unidade in unidades:
        key = (normalize_key(unidade["text"]), clean_text(unidade["value"]))

        if key in seen:
            continue

        seen.add(key)
        unique_unidades.append(unidade)

    if args.max_unidades is not None:
        unique_unidades = unique_unidades[: args.max_unidades]

    logging.info("Total de unidades válidas encontradas: %s", len(unique_unidades))

    return unique_unidades


def scrape_unidade(
    page: Page,
    args: argparse.Namespace,
    unidade: Dict[str, str],
    *,
    index: int,
    total: int,
) -> Dict[str, List[Dict[str, str]]]:
    semestre = f"{args.ano}.{args.periodo}"

    logging.info("A extrair unidade %s de %s: %s", index, total, unidade["text"])

    prepare_form(page, args)
    unidade_selecionada = select_unidade(page, unidade, timeout=args.timeout)

    logging.info("Unidade selecionada: %s", unidade_selecionada)

    click_buscar(page, timeout=args.timeout)
    wait_for_results(page, timeout=args.timeout)

    if args.debug_html:
        debug_dir = Path("debug_sigaa")
        debug_dir.mkdir(exist_ok=True)

        safe_name = re.sub(r"[^A-Za-z0-9_-]+", "_", unidade["text"])[:80]
        html_path = debug_dir / f"{index:03d}_{safe_name}.html"
        html_path.write_text(page.content(), encoding="utf-8")

    rows = extract_table_rows(page)

    partial = parse_sigaa_rows(rows, semestre=semestre, departamento=unidade_selecionada)

    logging.info(
        "Unidade %s de %s concluída: %s disciplina(s), %s turma(s).",
        index,
        total,
        len(partial["disciplinas"]),
        len(partial["turmas"]),
    )

    return partial


def build_final_payload(
    aggregate: Dict[str, Any],
    *,
    args: argparse.Namespace,
    unidades: List[Dict[str, str]],
    unidades_processadas: int,
    unidades_com_erro: List[Dict[str, str]],
) -> Dict[str, Any]:
    disciplinas = sorted(
        aggregate["_disciplinas_by_codigo"].values(),
        key=lambda item: item["codigo"],
    )

    turmas = sorted(
        aggregate["_turmas_by_key"].values(),
        key=lambda item: (
            item["disciplina_codigo"],
            item["codigo_turma"],
            item.get("departamento") or "",
        ),
    )

    return {
        "metadata": {
            "sistema": "SIGAA Hub",
            "universidade": "UFBA",
            "fonte": SIGAA_TURMAS_URL,
            "nivel_ensino": args.nivel,
            "semestre": f"{args.ano}.{args.periodo}",
            "coletado_em": datetime.now(timezone.utc).isoformat(),
            "total_unidades_encontradas": len(unidades),
            "total_unidades_processadas": unidades_processadas,
            "total_unidades_com_erro": len(unidades_com_erro),
            "total_disciplinas": len(disciplinas),
            "total_turmas": len(turmas),
            "unidades_com_erro": unidades_com_erro,
        },
        "disciplinas": disciplinas,
        "turmas": turmas,
        "links": [],
    }


def run_scraper(args: argparse.Namespace) -> Dict[str, Any]:
    aggregate: Dict[str, Any] = {
        "_disciplinas_by_codigo": {},
        "_turmas_by_key": {},
    }

    unidades_processadas = 0
    unidades_com_erro: List[Dict[str, str]] = []

    with sync_playwright() as playwright:
        browser: Browser = playwright.chromium.launch(headless=not args.headful, slow_mo=args.slow_mo)

        context: BrowserContext = browser.new_context(
            locale="pt-BR",
            timezone_id="America/Bahia",
            viewport={"width": 1366, "height": 900},
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0 Safari/537.36"
            ),
        )

        page = context.new_page()
        page.set_default_timeout(args.timeout)

        try:
            unidades = discover_unidades(page, args)

            if not unidades:
                raise RuntimeError("Nenhuma unidade válida encontrada.")

            total = len(unidades)

            for index, unidade in enumerate(unidades, start=1):
                try:
                    partial = scrape_unidade(page, args, unidade, index=index, total=total)
                    merge_results(aggregate, partial)
                    unidades_processadas += 1

                except Exception as exc:
                    logging.exception(
                        "Falha ao extrair unidade %s de %s: %s",
                        index,
                        total,
                        unidade["text"],
                    )

                    unidades_com_erro.append(
                        {
                            "unidade": unidade["text"],
                            "value": unidade.get("value", ""),
                            "erro": str(exc),
                        }
                    )

                    try:
                        page.goto(SIGAA_TURMAS_URL, wait_until="domcontentloaded", timeout=args.timeout)
                        safe_wait_networkidle(page)
                    except Exception:
                        pass

                    continue

            return build_final_payload(
                aggregate,
                args=args,
                unidades=unidades,
                unidades_processadas=unidades_processadas,
                unidades_com_erro=unidades_com_erro,
            )

        finally:
            context.close()
            browser.close()


def main() -> None:
    args = parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    try:
        payload = run_scraper(args)

        output_path = Path(args.output)
        output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        logging.info("Arquivo salvo: %s", output_path)
        logging.info(
            "Extração concluída: %s disciplinas, %s turmas, %s unidade(s) com erro.",
            payload["metadata"]["total_disciplinas"],
            payload["metadata"]["total_turmas"],
            payload["metadata"]["total_unidades_com_erro"],
        )

    except Exception as exc:
        logging.exception("Falha geral na execução: %s", exc)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
