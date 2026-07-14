# Estratégia de testes

## Pirâmide

### Unitários

Prioridade para:

- schemas Valibot;
- parsing de URL;
- normalização de semestre;
- transformações do scraper;
- geração de resultados da importação CSV;
- códigos de erro funcionais.

### Integração

- Server Actions com banco de teste;
- constraints de link ativo;
- transação de denúncias;
- RLS com contexto anônimo;
- upsert do scraper;
- importação parcial.

### End-to-end

Fluxos principais:

1. buscar turma;
2. filtrar departamento;
3. abrir link;
4. cadastrar link;
5. denunciar link;
6. importar CSV;
7. acessar página de status;
8. operação administrativa autorizada.

## Casos obrigatórios

### URL

- domínio correto;
- HTTP rejeitado;
- subdomínio falso rejeitado;
- host com sufixo malicioso rejeitado;
- link sem código rejeitado;
- espaços normalizados ou rejeitados de forma previsível.

### Unicidade

- primeira inserção funciona;
- segunda inserção ativa é bloqueada;
- inserções concorrentes resultam em apenas um link ativo.

### Denúncia

- menos de 10 caracteres;
- mais de 150;
- primeiro e segundo reportes;
- terceiro reporte desativa;
- concorrência não perde contagem.

### CSV

- cabeçalho ausente;
- colunas extras;
- linhas duplicadas;
- turma inexistente;
- semestre inválido;
- link duplicado;
- mistura de linhas válidas e inválidas;
- limite excedido.

## CI

Pipeline mínimo:

```text
install
lint
typecheck
test
build
```

Adicionar scanner de segredos e auditoria de dependências quando possível.
