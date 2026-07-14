# Guia de estilo

## TypeScript

- modo estrito;
- evitar `any`;
- preferir `unknown` e narrowing;
- tipos de retorno explícitos em funções públicas;
- unions discriminadas para resultados;
- nomes em inglês no código, salvo decisão consistente em contrário.

## React

- componentes pequenos e coesos;
- não usar `useEffect` para derivar estado que pode ser calculado;
- não duplicar estado vindo de props ou URL;
- handlers com nomes orientados a evento;
- composição em vez de excesso de props booleanas.

## Funções

- early returns;
- uma responsabilidade principal;
- nomes verbais;
- erros esperados como resultados tipados;
- exceções para falhas inesperadas.

## Arquivos

Sugestões:

- `kebab-case.tsx` para componentes e módulos;
- `schema.ts` para validação;
- `actions.ts` para Server Actions;
- `queries.ts` para leitura;
- `types.ts` somente quando os tipos não pertencem a um módulo mais específico.

## SQL

- migrations pequenas;
- nomes descritivos;
- constraints próximas da criação da tabela;
- comentários para funções complexas;
- policies com nomes que indiquem ator e operação.

## Conteúdo

- português brasileiro na UI;
- mensagens diretas;
- evitar jargão técnico para usuários;
- usar termos consistentes: turma, disciplina, departamento, grupo e denúncia.
