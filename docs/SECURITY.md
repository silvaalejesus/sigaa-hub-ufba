# Segurança

## Controles implementados

- validação Valibot e constraints SQL;
- índice único parcial contra concorrência;
- RPCs atômicas com `SECURITY DEFINER` e `search_path = ''`;
- rate limiting persistente no PostgreSQL;
- honeypot fora da área visual, sem `type=hidden`;
- HMAC SHA-256 por IP normalizado e escopo;
- nenhum IP bruto armazenado;
- logs estruturados com whitelist e redação;
- Sentry sem PII, bodies, cookies, headers ou query strings;
- headers HTTP via `next.config.mjs`.

## Headers

São enviados `nosniff`, `strict-origin-when-cross-origin`, `DENY`, Permissions Policy e COOP. A CSP inicia como `Content-Security-Policy-Report-Only`, sem `unsafe-eval`, `connect-src *` ou `script-src *`. Após observar violações reais em preview/produção, ajuste origens e substitua o nome do header por `Content-Security-Policy`.

HSTS não inclui `includeSubDomains` nem `preload` nesta fase; só deve ser ativado após confirmar HTTPS para todos os subdomínios relevantes.

<!-- post-phase2-functional-fixes-2026-07-21 -->
## Privacidade das correções

Nem motivo de denúncia, texto de feedback, nome, e-mail, URL de WhatsApp, fingerprint ou IP são enviados ao Sentry ou ao console. Resultados funcionais esperados não são incidentes. O Netlify recebe apenas os campos do formulário por `application/x-www-form-urlencoded`.
