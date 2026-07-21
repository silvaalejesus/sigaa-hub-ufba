# Deploy no Netlify

## Integração

Conecte o repositório no Netlify. O Next.js é detectado e executado pelo adaptador OpenNext da plataforma. `netlify.toml` versiona apenas o comando e as versões de Node/pnpm; não define `publish` nem plugin legado.

## Variáveis

Cadastre para Production e Deploy Previews, conforme o uso:

- build/runtime públicas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`;
- runtime secretas: `ABUSE_FINGERPRINT_SECRET`, opcionalmente `SENTRY_DSN`;
- build secretas: `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`;
- build/runtime: `SENTRY_TRACES_SAMPLE_RATE`, `STATUS_STALE_AFTER_HOURS`.

Variáveis alteradas exigem novo deploy quando são lidas no build. Nunca cadastrar service role no site Netlify.

## Publicação

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Após o preview:

```bash
curl -I https://URL_DO_PREVIEW
curl -I https://URL_DO_PREVIEW/status
curl -I https://URL_DO_PREVIEW/api/health
```

Teste cadastro, duplicidade, três denúncias, rate limit, honeypot, temas, mobile, logs e Sentry.

## Rate limiting da plataforma

O Netlify permite regras para funções, mas Server Actions do Next.js usam caminhos internos gerados pelo adaptador. Não são criados limites frágeis baseados nesses caminhos. A proteção de negócio permanece no Supabase. Uma regra adicional para `/api/health` só deve ser adicionada após medir o monitoramento legítimo.
