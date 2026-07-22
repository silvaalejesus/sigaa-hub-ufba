# Front-end

## Princípios

- Server Components por padrão.
- `"use client"` restrito ao menor componente possível.
- Acessibilidade como requisito funcional.
- Formulários com React Hook Form e Valibot.
- Componentes visuais desacoplados de acesso ao banco.
- Tema claro e escuro por `next-themes`.

## Estrutura sugerida

```text
app/
  layout.tsx
  page.tsx
  status/
  como-funciona/
  importar-links/
components/
  ui/
  layout/
features/
  classes/
  links/
  reports/
  csv-import/
  analytics/
lib/
  supabase/
  validation/
  observability/
types/
utils/
```

A estrutura deve refletir o código real. Não criar pastas vazias apenas para seguir este exemplo.

## Estado

Prioridade:

1. dados resolvidos no servidor;
2. parâmetros da URL;
3. estado local;
4. React Hook Form;
5. Zustand apenas para estado compartilhado e interativo que não se encaixe nas opções anteriores.

## Formulários

Cada formulário deve possuir:

- schema Valibot;
- validação equivalente no servidor;
- estado de envio;
- mensagens por campo;
- tratamento de erro inesperado;
- prevenção de envio duplicado;
- feedback de sucesso.

## UX de links

- Cadastro individual inline.
- Exibir claramente quando a turma já possui link ativo.
- Não substituir link silenciosamente.
- Denúncia com contador de caracteres e motivo obrigatório.
- Não mostrar informações que facilitem abuso do mecanismo de moderação.

## Importação CSV

A interface deve conter:

1. download do modelo;
2. seleção do arquivo;
3. leitura e pré-validação;
4. tabela de pré-visualização;
5. estados por linha;
6. confirmação explícita;
7. resumo final e arquivo de erros opcional.

O cliente pode fazer pré-validação, mas o servidor deve repetir todas as verificações.

## Acessibilidade

- HTML semântico.
- Labels associados.
- Mensagens com `aria-live` quando necessário.
- Foco previsível após ações.
- Contraste adequado nos dois temas.
- Operação completa por teclado.
- Não comunicar status apenas por cor.

<!-- post-phase2-functional-fixes-2026-07-21 -->
## Contagem, atualização e overlays

Links ativos exibem `reports` como texto acessível. A terceira denúncia apresenta toast prolongado, atualiza o estado local, fecha o formulário e executa `router.refresh()`. Os diálogos usam `modal` explicitamente; `useBodyScrollLock` preserva posição, largura da scrollbar e suporta overlays aninhados.
