# Guia Definitivo de Execução: SIGAA Hub

Este documento detalha o passo a passo para configurar a infraestrutura, extrair os dados e rodar a aplicação localmente.

## Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:

- Node.js 18 ou superior;
- pnpm;
- Python 3.9 ou superior;
- uma conta ativa no Supabase.

---

## Passo 1: Configuração do Banco de Dados (Supabase)

O banco de dados atua como a ponte entre o robô extrator em Python e a interface Next.js.

1. Acesse o painel do seu projeto no Supabase.
2. No menu lateral, vá em **Project Settings > API**.
3. Guarde estas três informações:
   - Project URL;
   - Project API Key `anon/public`;
   - Project API Key `service_role/secret`.

A chave `service_role` ignora as regras de segurança e nunca pode ser colocada no front-end.

Para uma instalação limpa, siga a documentação de banco de dados e execute o conteúdo versionado em `supabase/`. Não altere migrations apenas para configurar observabilidade.

---

## Passo 2: Extração de Dados e Alimentação (Back-end / Python)

O robô em Python navega no SIGAA, extrai os dados e os envia às tabelas do Supabase.

1. Navegue até a pasta do scraper:

```bash
cd scraper
```

2. Crie e ative o ambiente virtual:

```bash
python -m venv venv
```

No Windows:

```powershell
venv\Scripts\activate
```

No macOS/Linux:

```bash
source venv/bin/activate
```

3. Instale as dependências e o navegador do Playwright:

```bash
pip install -r requirements.txt
playwright install
```

4. Configure as variáveis exclusivas do scraper em ambiente seguro:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

5. Execute a raspagem e o seed conforme os scripts mantidos no diretório `scraper`:

```bash
python scraper.py
python seed.py
```

O Sentry não está integrado ao scraper Python nesta etapa.

---

## Passo 3: Executando a Interface (Front-end / Next.js)

Na raiz do projeto:

```bash
pnpm install
cp .env.example .env.local
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Preencha as credenciais públicas do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

A proteção antiabuso das denúncias usa um segredo exclusivo do servidor:

```env
REPORT_FINGERPRINT_SECRET=
```

Use um valor longo e aleatório. Não use o prefixo `NEXT_PUBLIC_`.

Inicie o servidor:

```bash
pnpm dev
```

Acesse `http://localhost:3000`.

---

## Passo 4: Sentry e Vercel

O Sentry fica desativado quando a aplicação classifica o ambiente como `local`. Portanto, o DSN pode permanecer vazio no desenvolvimento:

```env
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_VERCEL_ENV=
```

Para Preview e Production:

1. cadastre as variáveis no painel da Vercel;
2. habilite a exposição das System Environment Variables para preencher `NEXT_PUBLIC_VERCEL_ENV`;
3. habilite **Speed Insights** no painel do projeto;
4. faça um novo deploy após alterar qualquer variável.

`SENTRY_AUTH_TOKEN` é segredo de build e nunca pode ter prefixo `NEXT_PUBLIC_`.

A validação de envio deve ser feita em uma branch com deploy de Preview, sem deixar rota ou botão de erro no código final. Consulte [docs/OBSERVABILITY.md](./docs/OBSERVABILITY.md) e [docs/DEPLOY.md](./docs/DEPLOY.md).

## Validação antes de enviar alterações

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

O upload de source maps somente é executado quando `SENTRY_ORG`, `SENTRY_PROJECT` e `SENTRY_AUTH_TOKEN` estão disponíveis durante o build.
