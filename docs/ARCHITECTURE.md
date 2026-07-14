# Arquitetura

## Visão geral

O SIGAA Hub utiliza uma arquitetura desacoplada:

```text
SIGAA público
    |
    v
Scraper Python + Playwright
    |
    v
Supabase/PostgreSQL
    |
    v
Next.js App Router
    |
    v
Navegador
```

O scraper é responsável pela ingestão das turmas. A aplicação Next.js é responsável pela leitura pública, busca, filtros e fluxos colaborativos de links e denúncias.

## Componentes

### Aplicação web

Responsabilidades:

- renderizar páginas;
- consultar turmas do semestre vigente;
- aplicar busca e filtros;
- cadastrar e denunciar links por operações controladas;
- fornecer feedback ao usuário;
- emitir eventos de produto e telemetria técnica.

### Supabase

Responsabilidades:

- persistência PostgreSQL;
- constraints de integridade;
- RLS;
- consultas e operações transacionais;
- logs de API e banco.

### Scraper

Responsabilidades:

- extrair dados do SIGAA;
- normalizar disciplinas, departamentos e turmas;
- sincronizar por semestre;
- registrar execução e falhas;
- não depender do ciclo de deploy do front-end.

## Limites arquiteturais

- O navegador não recebe service role.
- Regras críticas não permanecem apenas em componentes React.
- A unicidade do link ativo deve ser garantida pelo banco, não somente pela interface.
- A desativação por denúncia deve evitar race conditions, idealmente por função transacional ou trigger.
- O scraper não deve importar componentes ou código do front-end.

## Organização atual observada

O repositório possui diretórios como:

```text
app/
components/
features/
lib/
public/
scraper/
supabase/
types/
utils/
.github/
```

A evolução deve preservar separação por responsabilidade. Funcionalidades de domínio podem permanecer em `features/`, enquanto componentes genéricos ficam em `components/`.

## Estratégia de renderização

- Server Components para leitura e composição.
- Client Components apenas para interação, formulários e APIs do navegador.
- Parâmetros de busca na URL para filtros compartilháveis.
- Cache somente quando compatível com atualização do semestre e dos links.

## Decisões futuras

OpenTelemetry pode ser adotado para traces e métricas portáveis quando a complexidade operacional justificar. A introdução não deve bloquear a implementação inicial de Sentry e analytics.
