# Contribuindo com o SIGAA Hub UFBA

## Antes de começar

1. Leia `AGENTS.md`.
2. Verifique o item correspondente em `docs/ROADMAP.md`.
3. Confirme se já existe issue ou pull request relacionado.
4. Evite misturar refatorações amplas com uma funcionalidade específica.

## Ambiente

Use preferencialmente `pnpm`, pois o repositório possui `pnpm-lock.yaml`.

```bash
pnpm install
pnpm dev
```

## Branches

Sugestões:

- `feat/nome-da-funcionalidade`
- `fix/descricao-do-problema`
- `docs/assunto`
- `refactor/escopo`
- `chore/escopo`

## Commits

Use mensagens objetivas:

```text
feat: adiciona pré-visualização da importação CSV
fix: impede segundo link ativo para a mesma turma
docs: documenta políticas RLS
```

## Pull requests

O PR deve informar:

- problema;
- solução;
- impactos;
- testes executados;
- mudanças de banco ou variáveis de ambiente;
- capturas de tela para alterações visuais;
- atualização documental realizada.

## Checklist

- [ ] regras validadas no servidor;
- [ ] RLS revisada quando aplicável;
- [ ] lint executado;
- [ ] TypeScript validado;
- [ ] testes executados;
- [ ] build executado para alterações estruturais;
- [ ] acessibilidade revisada;
- [ ] nenhum segredo foi versionado;
- [ ] documentação atualizada.
