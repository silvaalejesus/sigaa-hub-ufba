# ADR 0003 — Rate limiting persistente no Supabase

**Status:** aceito em 2026-07-17.

## Contexto

Instâncias serverless podem reiniciar ou executar em paralelo; um `Map` em memória não protege regras de negócio.

## Decisão

Persistir eventos pseudonimizados em `public.abuse_events` e aplicar limites dentro das RPCs transacionais. O identificador é HMAC SHA-256 do IP normalizado mais o escopo, usando segredo exclusivo do servidor. O IP bruto nunca é armazenado.

## Consequências

A proteção independe da hospedagem, suporta concorrência e possui retenção de 30 dias. O Netlify pode adicionar defesa de borda, mas não é a fonte de verdade.
