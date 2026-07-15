# Deploy na Vercel

## Ambientes

O projeto usa três classificações operacionais:

| Ambiente | Origem | Sentry |
| --- | --- | --- |
| Local | `pnpm dev` ou build fora da Vercel | desativado |
| Preview | branches e pull requests | `environment=preview` |
| Production | branch de produção | `environment=production` |

Na Vercel, habilite **Settings > Environment Variables > Automatically expose System Environment Variables**. Isso disponibiliza `NEXT_PUBLIC_VERCEL_ENV` para o Next.js e permite separar Preview de Production.

## Variáveis do front-end

Use `.env.example` como referência e configure os valores reais apenas no ambiente local seguro ou no painel da Vercel.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
REPORT_FINGERPRINT_SECRET=

NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_VERCEL_ENV=
```

### Escopo recomendado na Vercel

| Variável | Development | Preview | Production | Segredo |
| --- | ---: | ---: | ---: | ---: |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | sim | sim | não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | sim | sim | não, mas depende de RLS correta |
| `REPORT_FINGERPRINT_SECRET` | opcional | sim | sim | sim |
| `NEXT_PUBLIC_SENTRY_DSN` | vazio | sim | sim | não |
| `SENTRY_ORG` | opcional | sim | sim | não |
| `SENTRY_PROJECT` | opcional | sim | sim | não |
| `SENTRY_AUTH_TOKEN` | não | sim | sim | sim |
| `SENTRY_TRACES_SAMPLE_RATE` | opcional | sim | sim | não |
| `NEXT_PUBLIC_VERCEL_ENV` | automático | automático | automático | não |

`SENTRY_AUTH_TOKEN` deve existir somente no painel/CI. Nunca o copie para código, documentação com valor real ou variável `NEXT_PUBLIC_*`.

Após criar ou alterar variáveis, faça um novo deploy; a Vercel não aplica mudanças retroativamente a deployments existentes.

## Configuração do Sentry

1. Crie um projeto Next.js no Sentry.
2. Cadastre o DSN em Preview e Production.
3. Cadastre os slugs em `SENTRY_ORG` e `SENTRY_PROJECT`.
4. Gere um token para upload de source maps e salve em `SENTRY_AUTH_TOKEN`.
5. Use um único projeto Sentry com `environment=preview|production`, ou projetos separados se houver necessidade operacional futura. A configuração atual já separa os eventos por ambiente.

O build usa `withSentryConfig`. O upload de source maps somente é ativado quando `SENTRY_ORG`, `SENTRY_PROJECT` e `SENTRY_AUTH_TOKEN` estão presentes. A ausência dessas variáveis não deve impedir um build local.

## Vercel Analytics e Speed Insights

O layout preserva `@vercel/analytics` e inclui `@vercel/speed-insights/next`.

No painel da Vercel:

1. Abra **Analytics** e confirme que o recurso está habilitado.
2. Abra **Speed Insights** e clique em **Enable**.
3. Faça um novo deploy.
4. Acesse páginas do Preview/Production para gerar medições.

Nenhum Client Component adicional é necessário: os componentes oficiais são renderizados diretamente no `app/layout.tsx`.

## Pipeline de validação

Antes do deploy:

```bash
pnpm install
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Durante o build com credenciais do Sentry, verifique se não há falha de autenticação ou upload. Depois do deploy:

- abra a aplicação e confirme que as páginas principais continuam funcionando;
- confirme Analytics e Speed Insights no painel da Vercel;
- valide um erro apenas em branch/preview temporário;
- confirme `environment=preview` ou `environment=production` no evento;
- confirme stack trace desminificado;
- revise o evento e garanta que não contém cookies, headers, query string, link de WhatsApp, motivo de denúncia, formulário, IP ou fingerprint.

## Rollback e desativação

- Para interromper todos os envios do Sentry em um ambiente, remova `NEXT_PUBLIC_SENTRY_DSN` e redeploy.
- Para manter erros e interromper traces, use `SENTRY_TRACES_SAMPLE_RATE=0` e redeploy.
- Para interromper Speed Insights, desabilite o recurso no painel e, se necessário, remova o componente em uma alteração versionada.
- Não reutilize nem exponha `SENTRY_AUTH_TOKEN`; revogue-o no Sentry caso haja suspeita de vazamento.
