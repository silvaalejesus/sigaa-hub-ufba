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
    Page,
    TimeoutError as PlaywrightTimeoutError,
    sync_playwright,
)


SIGAA_TURMAS_URL = "https://sigaa.ufba.br/sigaa/public/turmas/listar.jsf?aba=p-ensino"

DEFAULT_NIVEL = "GRADUAÇÃO"

# Unidade padrão alinhada a disciplinas de computação no antigo Instituto de Matemática.
# Pode ser sobrescrita via --unidade.
DEFAULT_UNIDADE = "COORDENAÇÃO ACADÊMICA /IMS - VITÓRIA DA CONQUISTA"

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
    r"\b[2-7][MTN]\d{1,4}\b|"       # Ex: 24M34, 3T12, 6N34
    r"\b[2-7][MTN]\b|"               # Ex: 2M, 4T
    r"\b(?:SEG|TER|QUA|QUI|SEX|SAB|SÁB|DOM)\b|"
    r"\b\d{1,2}:\d{2}\b"
    r")",
    re.IGNORECASE,
)


def clean_text(value: str) -> str:
    """Normaliza espaços sem destruir acentos."""
    return re.sub(r"\s+", " ", value or "").strip()


def normalize_key(value: str) -> str:
    """Normaliza texto para comparação case-insensitive e sem acentos."""
    value = clean_text(value).lower()
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    return value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extrai turmas públicas do SIGAA UFBA usando Playwright."
    )

    parser.add_argument(
        "--ano",
        default="2026",
        help="Ano do semestre. Exemplo: 2026",
    )

    parser.add_argument(
        "--periodo",
        default="1",
        choices=["1", "2", "3", "4"],
        help="Período do ano acadêmico. Exemplo: 1 para 2026.1",
    )

    parser.add_argument(
        "--nivel",
        default=DEFAULT_NIVEL,
        help="Nível de ensino. Exemplo: GRADUAÇÃO",
    )

    parser.add_argument(
        "--unidade",
        default=DEFAULT_UNIDADE,
        help=(
            "Unidade/departamento usado no filtro. "
            "Exemplo: 'DEPARTAMENTO DE MATEMÁTICA/IME - SALVADOR'"
        ),
    )

    parser.add_argument(
        "--output",
        default="dados_sigaa.json",
        help="Arquivo JSON de saída.",
    )

    parser.add_argument(
        "--headful",
        action="store_true",
        help="Executa o navegador com interface visual para depuração.",
    )

    parser.add_argument(
        "--debug-html",
        action="store_true",
        help="Salva o HTML final em debug_sigaa.html.",
    )

    parser.add_argument(
        "--timeout",
        type=int,
        default=45_000,
        help="Timeout em milissegundos para navegação e seletores.",
    )

    parser.add_argument(
        "--slow-mo",
        type=int,
        default=0,
        help="Atraso em ms entre ações do Playwright. Útil em modo headful.",
    )

    return parser.parse_args()


def select_option_by_text(
    page: Page,
    target_text: str,
    *,
    exact: bool = False,
    timeout: int = 45_000,
) -> str:
    """
    Seleciona uma option em qualquer <select> da página pelo texto visível.

    Estratégia defensiva:
    - SIGAA/JSF costuma gerar ids pouco previsíveis.
    - Em vez de depender de ids, percorremos todos os selects e suas options.
    """
    target_norm = normalize_key(target_text)

    page.wait_for_selector("select", timeout=timeout)
    selects = page.locator("select")
    total_selects = selects.count()

    for select_index in range(total_selects):
        select = selects.nth(select_index)

        try:
            if not select.is_visible():
                continue

            options = select.locator("option").evaluate_all(
                """
                options => options.map(option => ({
                    text: (option.textContent || '').trim(),
                    value: option.value
                }))
                """
            )

            for option in options:
                option_text = clean_text(option["text"])
                option_norm = normalize_key(option_text)

                if exact:
                    matched = option_norm == target_norm
                else:
                    matched = target_norm in option_norm or option_norm in target_norm

                if matched and option.get("value") is not None:
                    select.select_option(value=option["value"])
                    logging.info("Selecionado: %s", option_text)
                    return option_text

        except Exception as exc:
            logging.warning(
                "Falha ao avaliar select #%s: %s",
                select_index,
                exc,
            )

    raise RuntimeError(f"Não encontrei opção compatível com: {target_text!r}")


def fill_first_visible_text_input(page: Page, value: str, *, timeout: int = 45_000) -> None:
    """
    Preenche o primeiro input textual visível.

    Na página pública de turmas, o input textual principal é o campo de ano.
    A seleção do período fica em um <select>.
    """
    selector = (
        "input[type='text'], "
        "input:not([type]), "
        "input[type='search']"
    )

    page.wait_for_selector(selector, timeout=timeout)
    inputs = page.locator(selector)
    total_inputs = inputs.count()

    for index in range(total_inputs):
        input_el = inputs.nth(index)

        try:
            if input_el.is_visible() and input_el.is_enabled():
                input_el.fill(value)
                logging.info("Campo textual preenchido com ano: %s", value)
                return
        except Exception as exc:
            logging.warning("Falha ao preencher input #%s: %s", index, exc)

    raise RuntimeError("Não encontrei input textual visível para preencher o ano.")


def click_buscar(page: Page, *, timeout: int = 45_000) -> None:
    """Clica no botão Buscar e aguarda navegação ou atualização dinâmica."""
    button = page.get_by_role("button", name=re.compile(r"buscar", re.IGNORECASE)).first

    try:
        button.wait_for(state="visible", timeout=timeout)

        try:
            with page.expect_navigation(wait_until="networkidle", timeout=timeout):
                button.click()
        except PlaywrightTimeoutError:
            # JSF pode atualizar a mesma página sem navegação completa.
            logging.info("Sem navegação completa após Buscar; aguardando rede/DOM.")
            page.wait_for_load_state("networkidle", timeout=10_000)

    except Exception as exc:
        raise RuntimeError(f"Não foi possível clicar em Buscar: {exc}") from exc


def wait_for_results(page: Page, *, timeout: int = 45_000) -> None:
    """
    Aguarda algum indício de resultado.

    O SIGAA pode retornar:
    - tabela de resultados;
    - mensagem de nenhum registro;
    - tela com validação de campos obrigatórios.
    """
    try:
        page.wait_for_function(
            """
            () => {
                const text = document.body.innerText || '';
                const hasTable = document.querySelectorAll('table tr').length > 5;
                const hasKnownTerms =
                    text.includes('Turma') ||
                    text.includes('Docente') ||
                    text.includes('Horário') ||
                    text.includes('Horario') ||
                    text.includes('Nenhum') ||
                    text.includes('nenhum');
                return hasTable && hasKnownTerms;
            }
            """,
            timeout=timeout,
        )
    except PlaywrightTimeoutError:
        logging.warning(
            "Timeout aguardando resultados. O HTML final será analisado mesmo assim."
        )


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
    """
    Detecta cabeçalhos de disciplina.

    Exemplos comuns:
    - MATA56 - PARADIGMAS DE PROGRAMAÇÃO
    - MATC82 - ENGENHARIA DE SOFTWARE I
    """
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

    # Remove fragmentos de cabeçalhos de tabela que às vezes aparecem na mesma linha.
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
    value = clean_text(value).upper()
    return bool(TURMA_RE.match(value))


def looks_like_schedule(value: str) -> bool:
    value = clean_text(value)
    return bool(HORARIO_RE.search(value))


def detect_header_map(cells: List[str]) -> Dict[str, int]:
    """
    Mapeia colunas a partir de uma linha de cabeçalho.

    Retorna índices para:
    - turma
    - horario
    - docente
    """
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


def extract_turma_from_cells(
    cells: List[str],
    header_map: Dict[str, int],
) -> Optional[Dict[str, str]]:
    """
    Extrai dados da turma de uma linha.

    Prioriza o mapeamento por cabeçalho.
    Quando não há cabeçalho confiável, usa heurísticas por regex.
    """
    if not cells:
        return None

    turma = ""
    professor = ""
    horario = ""

    if header_map:
        turma = safe_get(cells, header_map.get("turma"))
        professor = safe_get(cells, header_map.get("docente"))
        horario = safe_get(cells, header_map.get("horario"))

    if not turma or not is_turma_code(turma):
        turma_index = None

        for index, cell in enumerate(cells):
            if is_turma_code(cell):
                turma = clean_text(cell).upper()
                turma_index = index
                break
    else:
        turma_index = header_map.get("turma")

    if not turma or not is_turma_code(turma):
        return None

    if not horario:
        for cell in cells:
            if looks_like_schedule(cell):
                horario = clean_text(cell)
                break

    if not professor:
        ignored = {
            normalize_key(turma),
            normalize_key(horario),
        }

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

            # Evita pegar código/nome de disciplina como professor.
            if parse_disciplina_from_text(cell_clean):
                continue

            # Preferência por células após a coluna da turma, quando disponível.
            if turma_index is None or index > turma_index:
                candidates.append(cell_clean)

        if candidates:
            # Em geral, docente é uma célula textual mais longa que código/local/vagas.
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
) -> Dict[str, Any]:
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

                # A mesma linha pode conter também dados de turma, então não damos continue.

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
            }

            unique_key = (
                turma_record["disciplina_codigo"],
                turma_record["codigo_turma"],
                turma_record["professor"],
                turma_record["horario"],
                turma_record["semestre"],
            )

            if unique_key not in seen_turmas:
                seen_turmas.add(unique_key)
                turmas.append(turma_record)

        except Exception as exc:
            logging.warning("Falha ao processar linha da tabela: %s", exc)

    disciplinas = sorted(
        disciplinas_by_codigo.values(),
        key=lambda item: item["codigo"],
    )

    turmas = sorted(
        turmas,
        key=lambda item: (
            item["disciplina_codigo"],
            item["codigo_turma"],
            item["professor"],
        ),
    )

    return {
        "disciplinas": disciplinas,
        "turmas": turmas,
    }


def build_payload(
    *,
    rows: List[Dict[str, Any]],
    semestre: str,
    nivel: str,
    unidade: str,
    source_url: str,
) -> Dict[str, Any]:
    parsed = parse_sigaa_rows(
        rows,
        semestre=semestre,
        departamento=unidade,
    )

    return {
        "metadata": {
            "sistema": "SIGAA Hub",
            "universidade": "UFBA",
            "fonte": source_url,
            "nivel_ensino": nivel,
            "unidade_filtro": unidade,
            "semestre": semestre,
            "coletado_em": datetime.now(timezone.utc).isoformat(),
            "total_disciplinas": len(parsed["disciplinas"]),
            "total_turmas": len(parsed["turmas"]),
        },
        "disciplinas": parsed["disciplinas"],
        "turmas": parsed["turmas"],

        # Mantido para compatibilidade lógica com a tabela `links`.
        # O scraping de turmas não deve criar links automaticamente.
        "links": [],
    }


def run_scraper(args: argparse.Namespace) -> Dict[str, Any]:
    semestre = f"{args.ano}.{args.periodo}"

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=not args.headful,
            slow_mo=args.slow_mo,
        )

        context = browser.new_context(
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
            logging.info("Acessando página pública do SIGAA UFBA...")
            page.goto(SIGAA_TURMAS_URL, wait_until="networkidle", timeout=args.timeout)

            logging.info("Selecionando nível de ensino: %s", args.nivel)
            nivel_selecionado = select_option_by_text(
                page,
                args.nivel,
                exact=True,
                timeout=args.timeout,
            )

            if args.unidade:
                logging.info("Selecionando unidade: %s", args.unidade)
                unidade_selecionada = select_option_by_text(
                    page,
                    args.unidade,
                    exact=False,
                    timeout=args.timeout,
                )
            else:
                unidade_selecionada = ""

            fill_first_visible_text_input(page, args.ano, timeout=args.timeout)

            logging.info("Selecionando período: %s", args.periodo)
            periodo_selecionado = select_option_by_text(
                page,
                args.periodo,
                exact=True,
                timeout=args.timeout,
            )

            logging.info(
                "Filtro aplicado: nível=%s, unidade=%s, semestre=%s.%s",
                nivel_selecionado,
                unidade_selecionada,
                args.ano,
                periodo_selecionado,
            )

            click_buscar(page, timeout=args.timeout)
            wait_for_results(page, timeout=args.timeout)

            if args.debug_html:
                Path("debug_sigaa.html").write_text(
                    page.content(),
                    encoding="utf-8",
                )
                logging.info("HTML final salvo em debug_sigaa.html")

            rows = extract_table_rows(page)

            payload = build_payload(
                rows=rows,
                semestre=semestre,
                nivel=nivel_selecionado,
                unidade=unidade_selecionada or args.unidade,
                source_url=SIGAA_TURMAS_URL,
            )

            return payload

        except Exception:
            screenshot_path = Path("erro_sigaa.png")
            try:
                page.screenshot(path=str(screenshot_path), full_page=True)
                logging.error("Screenshot de erro salvo em %s", screenshot_path)
            except Exception:
                logging.error("Não foi possível salvar screenshot de erro.")

            raise

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
        output_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        logging.info("Arquivo salvo: %s", output_path)
        logging.info(
            "Extração concluída: %s disciplinas, %s turmas.",
            payload["metadata"]["total_disciplinas"],
            payload["metadata"]["total_turmas"],
        )

    except Exception as exc:
        logging.exception("Falha geral na execução: %s", exc)
        raise SystemExit(1)


if __name__ == "__main__":
    main()