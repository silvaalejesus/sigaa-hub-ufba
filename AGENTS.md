# AGENTS.md — SIGAA Hub UFBA

Este arquivo define as instruções permanentes para pessoas e agentes de IA que trabalham neste repositório.

## 1. Missão do projeto

O SIGAA Hub UFBA é uma plataforma pública e colaborativa para localizar turmas do semestre vigente e compartilhar links de grupos de WhatsApp associados a essas turmas.

O projeto é independente e não possui vínculo oficial com a Universidade Federal da Bahia, com o SIGAA ou com a Meta/WhatsApp.

## 2. Stack aprovada

- Next.js com App Router.
- React e TypeScript em modo estrito.
- Tailwind CSS.
- Shadcn UI e primitivas acessíveis.
- `next-themes` para tema claro/escuro.
- React Hook Form e Valibot.
- Supabase/PostgreSQL com Row Level Security.
- `@supabase/ssr` para integração com Next.js.
- Server Actions para operações de escrita.
- Python e Playwright para o scraper isolado.
- Vercel para deploy do front-end.

Não introduzir bibliotecas, serviços ou padrões arquiteturais novos sem necessidade demonstrável.

## 3. Regras de negócio obrigatórias

1. A consulta de turmas e o acesso aos links são públicos.
2. Somente URLs iniciadas por `https://chat.whatsapp.com/` são aceitas.
3. Uma turma pode possuir apenas um link ativo por vez.
4. A denúncia exige motivo entre 10 e 150 caracteres.
5. Ao atingir três denúncias válidas, o link deve ser desativado.
6. A busca pública deve considerar apenas o semestre vigente.
7. Toda regra crítica deve ser validada no servidor, mesmo quando também for validada no cliente.
8. A importação CSV deve respeitar exatamente as mesmas regras do cadastro individual.

## 4. Convenções arquiteturais

- Server Components são o padrão.
- Adicionar `"use client"` somente na folha interativa que realmente precisa dele.
- Operações de banco devem ficar fora de componentes visuais.
- Escritas devem passar por Server Actions ou endpoints controlados.
- Usar early returns para reduzir aninhamentos.
- Envolver operações externas e de banco em `try/catch`.
- Não expor mensagens internas, stack traces, chaves ou detalhes de RLS ao usuário.
- Retornar feedback acionável por toast ou mensagem inline.
- Manter tipos de domínio separados dos tipos gerados pelo banco quando isso melhorar clareza.
- Evitar estado global para estado que pode permanecer local, derivado da URL ou resolvido no servidor.
- Usar Zustand somente para estado compartilhado realmente interativo, quando necessário.

## 5. Convenções de UX

- Evitar modais sobrepostos.
- Preferir formulários inline, drawers ou páginas dedicadas.
- Manter navegação por teclado, foco visível, rótulos e mensagens de erro acessíveis.
- Preservar o estado de busca e filtros na URL quando isso facilitar compartilhamento e retorno.
- Não ocultar falhas silenciosamente.
- Interfaces de importação devem possuir pré-visualização e relatório por linha.

## 6. Segurança

- Nunca confiar em dados do cliente.
- Aplicar RLS em tabelas expostas pela API do Supabase.
- Não usar a service role no navegador.
- Adotar rate limiting, honeypot e controles antiautomação nos fluxos públicos de escrita.
- Sanitizar logs para evitar armazenamento de dados pessoais, tokens ou URLs sensíveis.
- Não coletar mais dados do que o necessário.

## 7. Qualidade

Antes de considerar uma tarefa concluída:

- executar lint;
- executar typecheck;
- executar testes afetados;
- executar build quando houver mudança estrutural;
- verificar estados de loading, erro, vazio e sucesso;
- atualizar a documentação correspondente;
- registrar decisão arquitetural relevante em `docs/adr/`.

## 8. Observabilidade e analytics

- Sentry: erros, exceções e diagnóstico técnico.
- Vercel Web Analytics: acessos e eventos de produto.
- Vercel Speed Insights: Core Web Vitals.
- Supabase Logs: banco, API e políticas.
- OpenTelemetry: evolução futura, sem obrigatoriedade imediata.
- GTM não é necessário enquanto não houver GA4, mídia paga ou múltiplas tags de marketing.
- AdOpt deve ser introduzido quando houver cookies ou rastreadores não essenciais que exijam consentimento.

## 9. Fonte de verdade

- Este arquivo define como desenvolver.
- `docs/ROADMAP.md` define o que será desenvolvido.
- `docs/ARCHITECTURE.md` descreve a arquitetura.
- `docs/DATABASE.md` e `docs/RLS.md` descrevem dados e autorização.
- O código e as migrations prevalecem quando houver divergência; a documentação deve ser corrigida no mesmo trabalho.
