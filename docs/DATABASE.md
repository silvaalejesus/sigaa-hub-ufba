# Banco de dados

## Estruturas da Fase 2

### `links`

Recebe `inactive_reason` e o índice parcial `one_active_link_per_class`. Duplicados ativos preexistentes são preservados, mas somente o mais recente permanece ativo; os demais recebem `deduplicated_active_link`.

### `link_reports`

Mantém o motivo de negócio e o fingerprint HMAC. Não possui leitura/escrita pública. A antiga unicidade permanente por fingerprint/link é substituída por janela transacional de 24 horas.

### `abuse_events`

Tabela interna de eventos pseudonimizados. Armazena escopo, fingerprint, recurso opcional, resultado e timestamp; nunca IP, URL ou motivo. Retenção inicial de 30 dias.

## Funções

- `add_link_secure(uuid, text, text)`;
- `report_link_secure(uuid, text, text)`;
- `cleanup_expired_abuse_events(interval, integer)` — apenas service role.

Todas usam `SECURITY DEFINER`, `search_path = ''`, nomes qualificados e grants explícitos.

<!-- post-phase2-functional-fixes-2026-07-21 -->
## Desativação versus exclusão

Na terceira denúncia, a linha de `links` permanece armazenada com `reports = 3`, `is_active = false` e `inactive_reason = 'reports_threshold'`. O índice `one_active_link_per_class` é parcial (`where is_active is true`), portanto históricos inativos não bloqueiam um novo convite diferente. `idx_links_unique_turma_url` continua impedindo a repetição do mesmo convite exato.
