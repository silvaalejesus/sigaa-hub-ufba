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
