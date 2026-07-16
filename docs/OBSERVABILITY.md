# Observabilidade e analytics

## Objetivos distintos

### Observabilidade técnica

Responder onde ocorreu a falha, qual operação estava em andamento, qual versão
foi afetada, recorrência e impacto de desempenho. Sentry permanece a ferramenta
planejada/principal, sem alteração da integração Next.js nesta entrega.

### Analytics de produto

Vercel Web Analytics mede uso agregado. Eventos customizados de produto continuam
fora do escopo desta etapa.

### Experiência e performance

Vercel Speed Insights é independente da página de status operacional.

### Banco

Supabase Logs auxilia diagnóstico de API, consultas e RLS. A tabela
`public.scraper_runs` mantém o histórico operacional do scraper.

## Página pública `/status`

A página é um Server Component, revalidado a cada 300 segundos, e usa somente a
anon key. Ela consulta RPCs `security definer` de retorno estritamente agregado.
Nenhuma mensagem SQL, metadata, erro sanitizado ou identificador de workflow é
exposto.

Estados:

- **Operacional**: banco acessível, consultas completas e último sucesso dentro
  de `STATUS_STALE_AFTER_HOURS`;
- **Dados desatualizados**: banco acessível e último sucesso além do limite;
- **Degradado**: consulta secundária falhou, último run falhou/foi parcial,
  execução `running` passou de 6 horas ou não existe sucesso registrado;
- **Indisponível**: o health check essencial do Supabase falhou.

O fallback de desatualização é 384 horas (16 dias), coerente com a coleta
quinzenal. Datas são renderizadas com `Intl.DateTimeFormat` e timezone
`America/Bahia`.

## Health check

`GET /api/health` faz uma única RPC leve com a anon key, usa
`Cache-Control: no-store` e retorna apenas:

```json
{
  "status": "ok",
  "timestamp": "2026-07-14T00:00:00.000Z"
}
```

O status HTTP é `200` quando a aplicação e o banco respondem e `503` quando a
dependência essencial está indisponível. O endpoint não inclui contagens, nomes
de tabelas, variáveis ou mensagens internas.

## Dados que não devem ser capturados

- motivo textual da denúncia;
- URL completa do grupo;
- conteúdo de CSV ou HTML;
- IP bruto;
- cookies e headers de autenticação;
- service role, DSN ou tokens;
- dados pessoais de estudantes ou docentes.

## Alertas mínimos

- aumento de erros em produção;
- Server Action crítica indisponível;
- scraper sem execução bem-sucedida no intervalo esperado;
- execução `running` por mais de 6 horas;
- degradação relevante de Core Web Vitals;
- falha persistente de conexão com Supabase.
