# Como instalar este pacote no repositório

1. Extraia o ZIP.
2. Copie `AGENTS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE_GUIDE.md` e a pasta `docs/` para a raiz do repositório.
3. Revise `README_PROPOSED.md`.
4. Depois da revisão, renomeie-o para `README.md`, substituindo o README genérico atual.
5. Não crie um arquivo `LICENSE` até escolher explicitamente a licença.
6. Compare `docs/DATABASE.md` e `docs/RLS.md` com as migrations reais.
7. Faça commit em uma branch de documentação.

Exemplo:

```bash
git checkout -b docs/documentacao-tecnica
git add AGENTS.md CONTRIBUTING.md CHANGELOG.md LICENSE_GUIDE.md docs
git commit -m "docs: adiciona documentação técnica do projeto"
```

O pacote não altera código, migrations ou configurações automaticamente.
