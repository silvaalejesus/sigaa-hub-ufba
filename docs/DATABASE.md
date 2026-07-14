# Banco de dados

Este documento descreve o modelo lógico esperado. Os nomes reais das tabelas e colunas devem ser confirmados pelas migrations existentes antes de qualquer alteração.

## Entidades principais

### Departamentos

- `id`
- `code`
- `name`
- timestamps

### Disciplinas

- `id`
- `code`
- `name`
- `department_id`
- timestamps

### Turmas

- `id`
- `subject_id`
- `class_code`
- `term`
- dados de horário e docentes quando disponíveis
- `source_updated_at`
- timestamps

### Links de WhatsApp

- `id`
- `class_id`
- `url`
- `is_active`
- `reports_count`
- `inactive_reason`
- `last_checked_at`
- timestamps

### Denúncias

- `id`
- `link_id`
- `reason`
- identificador antispam pseudonimizado, se adotado
- `created_at`

### Execuções do scraper

- `id`
- `term`
- `status`
- `started_at`
- `finished_at`
- contagens de leitura, inserção e atualização
- mensagem de erro sanitizada

## Constraints essenciais

### Um link ativo por turma

Usar índice único parcial:

```sql
create unique index if not exists one_active_link_per_class
on whatsapp_links (class_id)
where is_active = true;
```

### URL

A aplicação deve validar o formato. O banco pode adicionar uma constraint defensiva, sem substituir a validação da aplicação.

### Denúncias

A contagem e a desativação devem ser atualizadas atomicamente. Evitar ler o contador e depois atualizá-lo em duas chamadas independentes.

## Auditoria

Campos recomendados:

- `created_at`
- `updated_at`
- `last_checked_at`
- `inactive_reason`
- `source`
- `metadata` somente quando houver necessidade real

## Retenção e privacidade

Não armazenar IP bruto indefinidamente. Para antispam, preferir hash com segredo rotativo, retenção curta ou serviço de rate limiting dedicado.
