# Scraper

## Escopo

O scraper utiliza Python e Playwright e permanece isolado da aplicação Next.js.
A extração (`scraper.py`) e a sincronização (`seed.py`) são processos separados.
O arquivo `.scraper_run_state.json` transporta somente o `run_id` e o semestre
entre as duas etapas.

## Responsabilidades

- acessar a fonte pública;
- extrair departamentos, disciplinas e turmas;
- normalizar códigos, textos e semestre;
- fazer upsert no Supabase;
- registrar início, progresso útil e encerramento da execução;
- encerrar com código de saída coerente.

## Registro de execução

`run_tracking.py` insere uma linha em `public.scraper_runs` no início da coleta.
O status permanece `running` após a geração do JSON e só é finalizado depois do
seed:

- `success`: extração e sincronização completas, sem departamento com erro;
- `partial`: seed concluído, mas um ou mais departamentos falharam;
- `failed`: fluxo mínimo não concluído ou nenhuma unidade processada;
- `running`: execução ainda em andamento.

Atualizações são feitas somente no início, após a extração e no encerramento.
Não há uma escrita por turma.

### Origem

`SCRAPER_TRIGGER_SOURCE` aceita `manual`, `github_actions`, `local` ou
`scheduled`. Valores desconhecidos são normalizados; no GitHub Actions a origem
é inferida a partir de `GITHUB_ACTIONS` e `GITHUB_EVENT_NAME`.

### Metadados seguros

Podem ser enviados commit, número/ID do workflow, versão do scraper, fase e
quantidade agregada de departamentos com erro. Não são enviados HTML do SIGAA,
cookies, headers, conteúdo extraído, stack trace completo ou chaves.

Mensagens de erro têm no máximo 1.000 caracteres e passam por remoção de tokens,
JWTs, credenciais em URL e valores conhecidos de variáveis secretas.

## Execução local

```bash
cd scraper
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m playwright install chromium

export SUPABASE_URL="https://SEU-PROJETO.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="SUA-SERVICE-ROLE"
export SCRAPER_TRIGGER_SOURCE="local"

python scraper.py --ano 2026 --periodo 1 --output dados_sigaa.json
python seed.py --input dados_sigaa.json
```

O primeiro comando cria a execução e registra o resumo da extração. O segundo
encerra a mesma execução após os upserts.

## Falhas de telemetria

Falha ao inserir ou atualizar `scraper_runs` é registrada no log e enviada ao
Sentry quando `sentry_sdk` já estiver disponível. Ela não mascara a exceção
principal nem altera indevidamente o exit code.

## Execuções abandonadas

Um encerramento abrupto pode deixar uma linha em `running`. A página `/status`
considera potencialmente abandonada uma execução com mais de 6 horas. O banco
não é alterado automaticamente nesta fase. Para diagnosticar:

```sql
select id, status, semester, started_at, trigger_source
from public.scraper_runs
where status = 'running'
order by started_at desc;
```

Após confirmar que o processo não existe mais, a correção deve ser manual e
registrada, com mensagem sanitizada.

## Idempotência

Executar duas vezes para o mesmo semestre não cria duplicatas porque disciplinas
usam `codigo` e turmas usam `(disciplina_id, codigo_turma, semestre)` nos upserts.

## Não responsabilidades

- renderizar UI;
- decidir regras de moderação de links;
- depender do deploy da Vercel;
- apagar dados indiscriminadamente quando a origem estiver indisponível;
- verificar validade de links do WhatsApp.
