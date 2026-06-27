# 📖 Guia Definitivo de Execução: SIGAA Hub

Este documento detalha o passo a passo exato para configurar a infraestrutura, extrair os dados e rodar a aplicação localmente.

## 📌 Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:

- **Node.js** (v18 ou superior)
- **Python** (v3.9 ou superior)
- Uma conta ativa no **Supabase**

---

## Passo 1: Configuração do Banco de Dados (Supabase)

O banco de dados atua como a ponte entre o nosso robô extrator (Python) e a nossa interface (Next.js).

1. Acesse o painel do seu projeto no [Supabase](https://supabase.com).
2. No menu lateral esquerdo, vá em **Project Settings (Engrenagem) -> API**.
3. Guarde estas três chaves, você precisará delas nos próximos passos:

- **Project URL**
- **Project API Keys (anon / public)**
- **Project API Keys (service_role / secret)** _(Atenção: Esta chave tem superpoderes e ignora as regras de segurança. Nunca a coloque no front-end)._

1. Ainda no menu lateral, clique em **SQL Editor**.
2. Para garantir uma instalação limpa e evitar erros de `CONFLITO (ON CONFLICT)`, rode primeiro o script de limpeza:

```sql
drop table if exists public.links cascade;
drop table if exists public.turmas cascade;
drop table if exists public.disciplinas cascade;

```

1. Em seguida, copie todo o conteúdo do arquivo `supabase/schema.sql`, cole no SQL Editor e clique em **Run**. Isso criará as tabelas com as restrições `UNIQUE` corretas e as políticas de segurança (RLS).

---

## Passo 2: Extração de Dados e Alimentação (Back-end / Python)

O robô em Python navega no SIGAA, raspa os dados e os envia diretamente para as tabelas do Supabase que acabamos de criar.

1. Abra o terminal e navegue até a pasta do scraper:

```bash
cd scraper

```

1. Crie e ative o ambiente virtual (`venv`) para isolar as dependências do Python:

```bash
python -m venv venv

# No Windows:
venv\Scripts\activate
# No Mac/Linux:
source venv/bin/activate

```

1. Instale as bibliotecas necessárias e os navegadores do Playwright:

```bash
pip install -r requirements.txt
playwright install

```

1. Configure as variáveis de ambiente no terminal. Lembre-se de usar a chave secreta (`service_role`) aqui:

- **No Windows (CMD):**

```cmd
set SUPABASE_URL=sua_url_do_projeto
set SUPABASE_SERVICE_ROLE_KEY=sua_chave_secreta_service_role

```

- **No Mac/Linux/Powershell:**

```bash
export SUPABASE_URL="sua_url_do_projeto"
export SUPABASE_SERVICE_ROLE_KEY="sua_chave_secreta_service_role"

```

1. Execute a raspagem de dados. Este script abrirá o navegador em modo invisível e gerará o arquivo `dados_sigaa.json`:

```bash
python scraper.py

```

1. Envie os dados raspados para o banco de dados:

```bash
python seed.py

```

_Se aparecer a mensagem de "Upsert de disciplinas" com o número de registros inseridos com sucesso, o seu banco está pronto!_

---

## Passo 3: Executando a Interface (Front-end / Next.js)

Com o banco de dados populado, agora subimos o site para consumir essas informações.

1. Abra um novo terminal (ou saia da pasta scraper com `cd ..`) e garanta que você está na **raiz do projeto**.
2. Crie um arquivo chamado `.env.local` na raiz do projeto e insira as suas chaves públicas:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_projeto
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_publica_anon

```

1. Instale as dependências do ecossistema JavaScript:

```bash
npm install

```

1. Inicie o servidor de desenvolvimento:

```bash
npm run dev

```

1. Acesse `http://localhost:3000` no seu navegador. A barra de pesquisa já deve estar puxando as turmas diretamente do Supabase e o site pronto para uso!
