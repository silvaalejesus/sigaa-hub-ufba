# Back-end e Server Actions

## Escopo

O back-end da aplicação é composto por Supabase/PostgreSQL, políticas RLS e operações executadas pelo Next.js.

## Regras para Server Actions

- Validar input com Valibot.
- Não confiar no estado do cliente.
- Usar retorno discriminado, por exemplo:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string[]> }
```

- Mapear erros internos para mensagens públicas seguras.
- Registrar exceções inesperadas na observabilidade.
- Aplicar rate limiting antes de writes públicos.
- Invalidar cache ou revalidar caminhos somente após sucesso.

## Operações principais

### Adicionar link

1. validar URL;
2. validar turma e semestre vigente;
3. aplicar antispam;
4. confirmar ausência de link ativo;
5. inserir;
6. registrar evento técnico e de produto;
7. revalidar a visualização.

A constraint do banco é a proteção definitiva contra concorrência.

### Denunciar link

1. validar motivo;
2. confirmar link ativo;
3. aplicar antispam;
4. registrar denúncia;
5. atualizar contagem de forma atômica;
6. desativar no terceiro reporte;
7. registrar motivo de inativação.

### Importar CSV

- limite inicial recomendado: 100 linhas;
- processamento em lote controlado;
- idempotência quando possível;
- validação por linha;
- resultado parcial explícito;
- não fazer uma query independente por linha quando uma consulta em lote for possível.

## Erros

Categorias sugeridas:

- `VALIDATION_ERROR`
- `RATE_LIMITED`
- `CLASS_NOT_FOUND`
- `CLASS_OUTSIDE_CURRENT_TERM`
- `ACTIVE_LINK_EXISTS`
- `DUPLICATE_LINK`
- `DATABASE_ERROR`
- `UNEXPECTED_ERROR`

Códigos são estáveis; mensagens podem evoluir.
