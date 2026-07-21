# Backend

## Server Actions públicas

- `adicionarLink(turmaId, url, contactReference)` chama `add_link_secure`;
- `denunciarLink(linkId, motivo, contactReference)` chama `report_link_secure`.

Fluxo: parse, honeypot, fingerprint HMAC, RPC, mapeamento de status, revalidação e captura apenas de falhas inesperadas.

## Resultados funcionais

Cadastro: `added`, `active_link_exists`, `rate_limited`, `not_found`.
Denúncia: `reported`, `deactivated`, `duplicate`, `rate_limited`, `not_found`, `inactive`.

Mensagens SQL, constraints, fingerprints, IPs, motivos e URLs nunca são devolvidos ao navegador.

## Rate limiting

- cadastro: 5 tentativas/hora e 2 sucessos/24h por fingerprint;
- denúncia: 10 tentativas/hora e 1 denúncia por link/24h por fingerprint;
- retenção: 30 dias, com limpeza oportunista em lotes e função operacional para service role.
