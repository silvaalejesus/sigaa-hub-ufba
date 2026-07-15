# Observabilidade

## Escopo implementado

A primeira etapa de observabilidade do front-end cobre:

- captura de erros no navegador, Node.js e Edge Runtime com `@sentry/nextjs`;
- erros de navegação do App Router;
- erros globais de renderização pelo `app/global-error.tsx`;
- falhas não tratadas em Server Components, Route Handlers, middleware/proxy e outros pontos alcançados pelo hook `onRequestError`;
- captura explícita e sanitizada de falhas inesperadas nas Server Actions existentes;
- traces com amostragem baixa e configurável;
- upload de source maps nos builds que possuem as credenciais de CI do Sentry;
- Vercel Analytics preservado;
- Vercel Speed Insights habilitado no layout para builds de preview e production.

Session Replay, logs do Sentry e identificação de usuário não estão habilitados nesta etapa.

## Arquivos da integração

| Arquivo | Responsabilidade |
| --- | --- |
| `instrumentation-client.ts` | Inicialização no navegador e instrumentação de navegação. |
| `instrumentation.ts` | Carrega as configurações Node/Edge e exporta `onRequestError`. |
| `sentry.server.config.ts` | Inicialização no runtime Node.js. |
| `sentry.edge.config.ts` | Inicialização no Edge Runtime. |
| `app/global-error.tsx` | Captura erros globais do App Router. |
| `lib/observability/sentry-options.ts` | Ambiente, amostragem e sanitização de eventos/breadcrumbs. |
| `lib/observability/capture-unexpected-error.ts` | Captura falhas operacionais sem anexar entradas do usuário ou detalhes brutos do Supabase. |
| `next.config.mjs` | Integra `withSentryConfig` e prepara source maps. |

## Configurar um projeto no Sentry

1. Crie um projeto do tipo **Next.js** na organização desejada.
2. Copie o DSN exibido em **Project Settings > Client Keys (DSN)**.
3. Anote o slug da organização e o slug do projeto.
4. Crie um token de autenticação destinado ao build/source maps, usando o fluxo recomendado pelo próprio Sentry para a organização.
5. Cadastre as variáveis na Vercel para **Preview** e **Production**.

Variáveis utilizadas:

```env
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_VERCEL_ENV=
```

Regras:

- `NEXT_PUBLIC_SENTRY_DSN` é público por natureza e pode ser exposto ao bundle do navegador.
- `SENTRY_AUTH_TOKEN` é segredo de build. Nunca use o prefixo `NEXT_PUBLIC_` e nunca o inclua em commits, logs ou capturas de tela.
- `SENTRY_ORG` e `SENTRY_PROJECT` devem conter os slugs, não os nomes de exibição.
- `NEXT_PUBLIC_VERCEL_ENV` é fornecida pela Vercel quando o acesso às System Environment Variables está habilitado.

## Ambientes e ativação

A aplicação classifica os eventos como:

- `production`: deploy de produção da Vercel;
- `preview`: deploy de preview da Vercel;
- `local`: desenvolvimento e builds executados fora da Vercel.

O SDK somente envia eventos quando existe `NEXT_PUBLIC_SENTRY_DSN` e o ambiente não é `local`. Portanto, a telemetria fica desativada localmente mesmo que outras variáveis do Sentry estejam presentes.

Para desativar temporariamente a coleta em Preview ou Production, remova o DSN daquele ambiente e faça um novo deploy. Para manter erros ativos e desativar apenas traces, use:

```env
SENTRY_TRACES_SAMPLE_RATE=0
```

## Amostragem de traces

`SENTRY_TRACES_SAMPLE_RATE` aceita um número entre `0` e `1`:

- `0`: nenhum trace de performance;
- `0.1`: 10% dos traces;
- `1`: todos os traces.

O fallback é `0.1`. Valores vazios, não numéricos, negativos ou superiores a `1` são rejeitados e substituídos pelo fallback. A variável não contém segredo; o `next.config.mjs` injeta o valor validado no bundle do navegador para manter a mesma taxa entre client, server e Edge.

## Privacidade e sanitização

A integração usa `sendDefaultPii: false` e aplica filtros antes do envio de erros, transações e breadcrumbs.

Não devem chegar ao Sentry:

- URL completa de convite do WhatsApp;
- motivo textual de denúncia;
- nome, email ou descrição do formulário de feedback;
- conteúdo de formulários ou arquivos CSV;
- IP, user agent ou fingerprint antiabuso;
- IDs de links, turmas, estudantes ou docentes adicionados manualmente como contexto;
- cookies, headers, query strings ou corpo de requisições;
- headers de autorização;
- tokens, JWTs, DSNs, chaves do Supabase ou outros segredos;
- breadcrumbs de console e de cliques da interface;
- mensagens brutas de exceção, substituídas por uma descrição genérica antes do envio.

O helper de captura das Server Actions cria uma exceção operacional com nome da operação, subsistema e códigos técnicos seguros. O erro bruto do Supabase, as entradas recebidas e os identificadores da denúncia não são anexados ao evento.

A fingerprint antiabuso usada pela regra de denúncias continua restrita ao fluxo do servidor/Supabase e não é enviada ao Sentry.

## Erros esperados e inesperados

Não são capturados como incidentes:

- falhas de validação do Valibot;
- link duplicado ou segundo link impedido por constraint;
- link de WhatsApp inválido;
- denúncia repetida pela mesma conexão;
- link já indisponível para denúncia;
- parâmetros funcionais inválidos;
- busca sem resultados;
- respostas futuras de rate limiting tratadas pela regra de negócio.

São capturados:

- exceções não tratadas;
- falhas inesperadas ao criar o cliente ou acessar o Supabase;
- códigos de banco não classificados como resultado funcional;
- falhas de infraestrutura nas Server Actions;
- erros globais do App Router e erros de runtimes cobertos pelo `onRequestError`.

As Server Actions mantêm o formato `{ ok, message }` e retornam mensagens genéricas ao usuário em falhas inesperadas.

## Validar um erro de teste

Não existe rota permanente de teste no projeto.

Para validar com segurança:

1. Crie uma branch temporária.
2. Adicione temporariamente um botão em uma página que execute `throw new Error('Sentry verification error')` no manipulador de clique.
3. Gere um deploy de **Preview** com o DSN configurado.
4. Acione o botão no próprio preview; erros disparados diretamente no console do navegador não representam o fluxo normal da aplicação.
5. Confirme o evento em **Sentry > Issues** com `environment=preview`.
6. Remova o botão antes de mesclar a branch.

Também é possível validar uma falha de servidor em uma branch temporária, desde que o endpoint/componente seja removido antes do merge e não receba dados reais de usuários.

## Confirmar source maps

1. Configure `SENTRY_ORG`, `SENTRY_PROJECT` e `SENTRY_AUTH_TOKEN` no ambiente do build.
2. Faça um novo deploy; builds anteriores não recebem variáveis adicionadas posteriormente.
3. Confirme nos logs de build que o plugin do Sentry processou o upload sem erro de autenticação.
4. Abra um erro de Preview e verifique se o stack trace aponta para arquivos TypeScript/TSX e linhas do projeto, em vez de apenas chunks minificados.
5. No Sentry, confira os artefatos/debug files associados ao release do deploy quando necessário.

Sem as três credenciais de upload, o build continua funcionando, mas o processamento de source maps pelo plugin fica desativado. Depois de um upload bem-sucedido, os source maps gerados são removidos dos artefatos públicos do build.

## Vercel Analytics e Speed Insights

`app/layout.tsx` renderiza os dois componentes somente quando `NODE_ENV === 'production'`. No Next.js, isso inclui builds de Preview e Production da Vercel e exclui `pnpm dev`.

Para ativar a coleta do Speed Insights:

1. Abra o projeto na Vercel.
2. Acesse **Speed Insights**.
3. Clique em **Enable**.
4. Faça um novo deploy e gere tráfego real no Preview/Production.

O Vercel Analytics existente permanece ativo e não recebeu eventos customizados nesta etapa.

## Fora do escopo atual

- Session Replay;
- Sentry no scraper Python;
- OpenTelemetry ou SigNoz;
- rota `/status`;
- eventos customizados do Vercel Analytics;
- GTM, GA4 e AdOpt.
