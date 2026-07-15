# SIGAA Hub — etapa 1 de observabilidade

## Aplicação

Copie o conteúdo de `overlay/` sobre a raiz de um checkout atualizado do repositório e execute:

```bash
pnpm install
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

O arquivo `pnpm-lock.yaml` já contém as dependências adicionadas.

## Conteúdo

- integração Sentry para navegador, Node.js, Edge Runtime, navegação e App Router;
- sanitização conservadora e captura explícita de falhas inesperadas nas Server Actions;
- Vercel Speed Insights preservando Analytics;
- source maps configurados para upload em Preview/Production;
- `.env.example` e documentação;
- baseline de ESLint necessário para o script `pnpm lint` existente;
- ajuste de tipagem Supabase/RPC necessário para `tsc --noEmit`.

## Limitação

Não houve commit/push no GitHub: este ambiente não possui credenciais de escrita e não conseguiu clonar o repositório via Git/DNS. Os arquivos públicos foram auditados no GitHub e a implementação foi validada numa reconstrução local da superfície relevante. Faça a validação final num checkout completo antes do merge.
