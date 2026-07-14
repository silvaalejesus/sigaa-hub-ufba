# Scraper

## Escopo

O scraper utiliza Python e Playwright e deve permanecer isolado da aplicação Next.js.

## Responsabilidades

- acessar a fonte pública;
- extrair departamentos, disciplinas e turmas;
- normalizar códigos, textos e semestre;
- fazer upsert no Supabase;
- registrar execução;
- encerrar com código de saída coerente.

## Não responsabilidades

- renderizar UI;
- decidir regras de moderação de links;
- possuir dependência do deploy da Vercel;
- apagar dados indiscriminadamente quando a origem estiver temporariamente indisponível.

## Idempotência

Executar duas vezes para o mesmo semestre não deve criar duplicatas. Definir chaves naturais ou identificadores estáveis para upsert.

## Falhas

Classificar:

- mudança de seletor;
- timeout;
- indisponibilidade da origem;
- erro de autenticação, se existir;
- erro de normalização;
- erro de escrita no Supabase.

Registrar contexto suficiente sem expor segredos ou HTML excessivo.

## Execução

Documentar no repositório o ambiente real de execução, por exemplo GitHub Actions, cron externo ou máquina controlada.

## Última sincronização

A página `/status` deve usar uma tabela de execuções ou metadado confiável, não a data de atualização de uma turma aleatória.

## Verificação de links

A checagem de links do WhatsApp é uma rotina separada. Ela deve respeitar termos de uso, limites e incerteza da resposta. Não desativar links com base em um único timeout.
