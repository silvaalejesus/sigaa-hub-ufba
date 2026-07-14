# Segurança

## Modelo de ameaça resumido

Como a aplicação permite escrita anônima, os principais riscos são:

- spam de links;
- denúncias automatizadas;
- links maliciosos ou fora do domínio;
- abuso de concorrência;
- enumeração e scraping excessivo;
- exposição de chaves;
- dados de telemetria contendo informações indevidas.

## Controles prioritários

### Validação

- Valibot no cliente para UX.
- Valibot no servidor para segurança.
- allowlist estrita do host `chat.whatsapp.com`.
- usar `URL` para parsing; não confiar apenas em `startsWith`.

### Rate limiting

Aplicar em:

- cadastro individual;
- denúncia;
- importação CSV;
- rotas administrativas;
- health check detalhado, se expuser informações operacionais.

Definir limites por ação, não um único limite global.

### Honeypot

Campos ocultos devem:

- não receber foco;
- ter nome não óbvio;
- ser verificados no servidor;
- não ser o único mecanismo antispam.

### Segredos

- `NEXT_PUBLIC_*` somente para valores realmente públicos.
- Service role nunca no client bundle.
- Chaves em variáveis de ambiente.
- Rotação após suspeita de vazamento.

### Cabeçalhos

Avaliar CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e proteção de framing.

### Administração

O painel administrativo deve exigir autenticação e autorização explícita. Não usar apenas URL secreta.

## Cookies e consentimento

Sentry, analytics e ferramentas de terceiros devem ser configurados segundo a coleta efetiva. AdOpt torna-se necessário quando houver cookies ou rastreadores não essenciais. GTM não é requisito por si só.

## Relato de vulnerabilidade

Antes de publicar um canal público, definir um e-mail ou fluxo privado para relatos. Não incluir endereço inventado na documentação.
