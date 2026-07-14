# ADR 0004 — Importação CSV com preview

- Estado: Aceita
- Data: 2026-07-13

## Contexto

Comunidades de cursos criam aproximadamente vinte grupos por semestre. O cadastro individual cria atrito.

## Decisão

Criar importação CSV com modelo, pré-visualização, validação por linha e confirmação antes da escrita.

## Consequências

- melhor produtividade;
- maior superfície de abuso;
- necessidade de limite de arquivo e linhas;
- validação completa no servidor;
- relatório parcial e testes de concorrência.
