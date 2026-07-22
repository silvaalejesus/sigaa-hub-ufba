# Funcionalidades

## Existentes ou estruturais

Com base na estrutura atual do repositório e nas definições do projeto:

- aplicação Next.js;
- componentes e features organizados;
- integração com Supabase;
- scraper Python;
- deploy Vercel;
- Vercel Analytics como dependência;
- busca e fluxo colaborativo como domínio principal.

A implementação real deve ser confirmada no código antes de marcar um item como concluído.

## Planejadas

### Observabilidade

- Sentry;
- Speed Insights;
- eventos customizados;
- alertas.

### Segurança

- rate limiting;
- honeypot;
- cabeçalhos;
- auditoria;
- proteção administrativa.

### Status

- saúde da aplicação;
- semestre atual;
- última sincronização;
- métricas agregadas.

### Importação CSV

- modelo;
- upload;
- preview;
- confirmação;
- validação em lote;
- relatório final.

### Administração

- listar links denunciados;
- desativar e reativar;
- consultar denúncias;
- acompanhar métricas;
- auditoria de ações.

### Conteúdo institucional

- página Como funciona;
- aviso de independência;
- política de privacidade;
- termos de uso, quando necessários.

<!-- post-phase2-functional-fixes-2026-07-21 -->
# Funcionalidades

## Moderação colaborativa

Cada link ativo mostra a contagem de denúncias. A terceira denúncia o remove temporariamente da listagem, preserva o histórico e libera a turma para um novo convite diferente. A mensagem de análise representa o fluxo planejado; não existe painel administrativo nesta fase.

## Feedback

O formulário público usa Netlify Forms, honeypot e validação Valibot. As notificações por e-mail são configuradas no painel do Netlify.
