# Observabilidade e analytics

## Objetivos distintos

### Observabilidade técnica

Responder:

- onde ocorreu a falha;
- qual operação estava em andamento;
- qual versão foi afetada;
- se o problema é recorrente;
- qual impacto de desempenho existe.

Ferramenta principal planejada: Sentry.

### Analytics de produto

Responder:

- quantas pessoas acessam;
- quais buscas e filtros são usados;
- quantas pessoas abrem links;
- quais fluxos falham ou ficam sem resultado.

Ferramenta inicial: Vercel Web Analytics, já presente como dependência no projeto.

### Experiência e performance

Ferramenta planejada: Vercel Speed Insights.

### Banco

Usar Supabase Logs para erros de API, consultas, autenticação e políticas.

## Eventos de produto

Nomes sugeridos:

- `search_performed`
- `department_filter_selected`
- `search_no_results`
- `whatsapp_link_clicked`
- `link_form_opened`
- `link_submission_succeeded`
- `link_submission_failed`
- `report_submission_succeeded`
- `report_submission_failed`
- `csv_import_started`
- `csv_import_previewed`
- `csv_import_finished`
- `csv_import_failed`

## Propriedades

Coletar apenas propriedades úteis e não sensíveis:

- departamento;
- tipo de dispositivo agregado;
- quantidade de resultados;
- código de erro funcional;
- quantidade de linhas do CSV;
- total importado, ignorado e inválido.

Não enviar:

- motivo textual da denúncia;
- URL completa do grupo;
- conteúdo do CSV;
- IP bruto;
- dados pessoais de estudantes ou docentes.

## Sentry

Capturar:

- exceções inesperadas;
- falhas de Server Actions;
- erros de integração com Supabase;
- falhas do scraper em projeto ou ambiente separado;
- release e ambiente.

Evitar capturar erros esperados de validação como exceções de alta prioridade.

## OpenTelemetry e SigNoz

OpenTelemetry permanece como caminho de evolução para traces, métricas e portabilidade. SigNoz pode ser adotado quando o projeto justificar operação de collector e backend de telemetria. Não é requisito da fase inicial.

## GTM

Não adicionar agora. Reavaliar quando houver:

- GA4;
- campanhas;
- Google Ads;
- múltiplos pixels;
- necessidade de governança centralizada de tags.

## Alertas mínimos

- aumento de erros em produção;
- Server Action crítica indisponível;
- scraper sem execução bem-sucedida no intervalo esperado;
- degradação relevante de Core Web Vitals;
- falha persistente de conexão com Supabase.
