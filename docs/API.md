# Contratos de aplicação

O projeto utiliza Server Actions e Supabase, não necessariamente uma API REST pública. Este documento registra contratos funcionais.

## Resultado padrão

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      code: string
      message: string
      fieldErrors?: Record<string, string[]>
    }
```

## Adicionar link

Entrada lógica:

```ts
type AddLinkInput = {
  classId: string
  url: string
  honeypot?: string
}
```

Saída de sucesso:

```ts
type AddLinkData = {
  linkId: string
}
```

Erros relevantes:

- `VALIDATION_ERROR`
- `CLASS_NOT_FOUND`
- `CLASS_OUTSIDE_CURRENT_TERM`
- `ACTIVE_LINK_EXISTS`
- `DUPLICATE_LINK`
- `RATE_LIMITED`

## Denunciar link

```ts
type ReportLinkInput = {
  linkId: string
  reason: string
  honeypot?: string
}
```

Retorno não deve revelar identidade, IP, detalhes de outros reportes ou limiares adicionais de antispam.

## Importar CSV

Entrada:

- arquivo ou conteúdo controlado;
- máximo inicial de 100 linhas;
- tamanho máximo documentado.

Resultado:

```ts
type CsvImportResult = {
  total: number
  imported: number
  skipped: number
  invalid: number
  rows: Array<{
    row: number
    status: "imported" | "skipped" | "invalid"
    code?: string
    message?: string
  }>
}
```

## Status

A rota pública deve expor apenas informações não sensíveis:

- aplicação disponível;
- semestre vigente;
- última sincronização bem-sucedida;
- contagens agregadas opcionais.

Detalhes internos, mensagens SQL e chaves nunca devem ser retornados.
