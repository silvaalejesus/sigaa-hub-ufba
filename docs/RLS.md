# Row Level Security

## Objetivo

RLS é uma camada de defesa do banco e deve permanecer ativa nas tabelas expostas pela API do Supabase.

## Princípios

- leitura pública apenas dos dados necessários;
- links públicos somente quando ativos;
- denúncias e cadastros com regras restritas;
- nenhuma operação privilegiada pelo navegador;
- service role apenas em ambientes de servidor controlados e no scraper, quando indispensável.

## Leitura pública

Políticas devem limitar:

- turmas ao semestre vigente quando possível;
- links a `is_active = true`;
- colunas sensíveis ou operacionais.

Views públicas podem ser usadas para expor somente o formato necessário.

## Escrita pública

Há duas estratégias válidas:

1. policies que permitem inserção anônima com constraints rigorosas;
2. Server Actions que chamam uma função SQL controlada.

Para regras compostas, contadores e prevenção de corrida, funções SQL com `security definer` podem ser adequadas, mas exigem:

- `search_path` fixo;
- grants mínimos;
- validação interna;
- revisão cuidadosa.

## Denúncias

A operação deve:

- inserir a denúncia;
- atualizar o contador;
- desativar o link quando aplicável;
- ocorrer em uma transação.

## Testes de RLS

Testar ao menos:

- usuário anônimo lê turma vigente;
- usuário anônimo não lê dado restrito;
- link inativo não aparece publicamente;
- segundo link ativo é bloqueado;
- operação não ignora a regra por concorrência;
- service role é usada apenas onde documentado.
