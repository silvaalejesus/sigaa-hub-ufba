# ADR 0001 — Server Components por padrão

- Estado: Aceita
- Data: 2026-07-13

## Contexto

A aplicação usa Next.js App Router e possui grande parte do conteúdo orientado à leitura.

## Decisão

Server Components serão o padrão. Client Components serão usados apenas nas folhas interativas.

## Consequências

- menor JavaScript enviado ao navegador;
- acesso a dados mais próximo do servidor;
- necessidade de delimitar formulários, estados e APIs de browser;
- componentes interativos devem receber dados serializáveis.
