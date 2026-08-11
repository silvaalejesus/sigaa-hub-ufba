# Google Analytics 4

## Objetivo

O SIGAA Hub usa o Google Analytics 4 para medir navegação e interações de produto. A integração não envia termos pesquisados, nomes de departamentos, professores, URLs de grupos, motivos de denúncia ou dados do formulário de feedback.

O carregamento ocorre somente em produção e apenas quando `NEXT_PUBLIC_GA_MEASUREMENT_ID` contém um ID válido iniciado por `G-`.

## Configuração

1. No Google Analytics, crie uma propriedade GA4.
2. Crie um fluxo de dados do tipo **Web** para o domínio publicado.
3. No fluxo Web, desative o envio de `page_view` por mudanças no histórico em **Medição otimizada**, pois o projeto envia pageviews manualmente.
4. Se quiser impedir que o GA4 capture termos de busca automaticamente, também desative a medição de **Pesquisa no site**.
5. Copie o ID de métricas no formato `G-XXXXXXXXXX`.
6. No Netlify, abra **Site configuration > Environment variables**.
7. Crie:

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

8. Faça um novo deploy.
9. Valide em **Relatórios > Tempo real** e no DebugView/Tag Assistant.

## Eventos personalizados

| Evento                      | Significado                             | Parâmetros                                                  |
| --------------------------- | --------------------------------------- | ----------------------------------------------------------- |
| `page_view`                 | Navegação por página, sem query string  | `page_path`, `page_title`, `page_location`                  |
| `search_filter_changed`     | Busca textual aplicada ou removida      | `has_query`, `query_length`                                 |
| `department_filter_changed` | Filtro de departamento alterado         | `selected`                                                  |
| `groups_filter_changed`     | Filtro “apenas com grupos” alterado     | `enabled`                                                   |
| `pagination_changed`        | Usuário mudou de página                 | `from_page`, `to_page`, `page_size`, `total_pages`          |
| `page_size_changed`         | Quantidade de itens por página alterada | `previous_page_size`, `page_size`, `total_items`            |
| `course_classes_opened`     | Modal de turmas aberto                  | `course_code`, `total_classes`, `active_groups`             |
| `whatsapp_group_opened`     | Link externo do grupo acionado          | `course_code`, `class_code`                                 |
| `add_link_form_opened`      | Formulário de contribuição aberto       | `course_code`, `class_code`                                 |
| `link_submitted`            | Novo link enviado com sucesso           | `course_code`, `class_code`                                 |
| `report_form_opened`        | Formulário de denúncia aberto           | `course_code`, `class_code`                                 |
| `report_submitted`          | Denúncia enviada com sucesso            | `course_code`, `class_code`, `reports_count`, `link_active` |
| `feedback_submitted`        | Feedback enviado com sucesso            | sem parâmetros                                              |

## Privacidade

A integração:

- envia `page_location` sem query string;
- desativa `allow_google_signals`;
- desativa `allow_ad_personalization_signals`;
- bloqueia parâmetros com nomes associados a e-mail, nome, URL, link, motivo, texto de feedback, professor, IP ou identificador de usuário;
- limita parâmetros textuais a 100 caracteres;
- não registra o conteúdo da busca, somente se existe busca e seu tamanho;
- não registra qual departamento foi selecionado, somente se existe filtro.

Antes de ativar a coleta, mantenha a política de privacidade do site atualizada e defina a estratégia de consentimento aplicável ao projeto.

## Validação técnica

Execute:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Em produção, confirme no DevTools que:

- `gtag/js?id=G-...` foi carregado;
- requisições para `google-analytics.com` não foram bloqueadas pela CSP;
- `page_location` não contém `q`, `departamento`, `pagina` ou `porPagina`;
- nenhum evento contém URL de WhatsApp, termo de busca ou dados de feedback.
