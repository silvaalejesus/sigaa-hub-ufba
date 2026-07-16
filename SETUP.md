# Configuração local do SIGAA Hub UFBA

## Pré-requisitos

- Node.js compatível com Next.js 16;
- pnpm;
- Python 3.9 ou superior;
- projeto Supabase;
- Supabase CLI ou acesso ao SQL Editor.

## 1. Banco de dados

Aplique `supabase/schema.sql` em uma instalação nova e, em seguida, as migrations
versionadas, incluindo:

```text
supabase/migrations/202607140001_scraper_runs_status.sql
```

Com a CLI:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

A service role ignora RLS. Ela nunca deve ser usada no navegador ou em variável
`NEXT_PUBLIC_*`.

## 2. Aplicação Next.js

Copie `.env.example` para `.env.local` e preencha apenas as variáveis públicas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
STATUS_STALE_AFTER_HOURS=384
```

Execute:

```bash
pnpm install
pnpm dev
```

Rotas para validação:

- `http://localhost:3000/status`;
- `http://localhost:3000/api/health`.

## 3. Scraper e seed

```bash
cd scraper
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m playwright install chromium
```

Configure somente no terminal/backend confiável:

```bash
export SUPABASE_URL="https://SEU-PROJETO.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE"
export SCRAPER_TRIGGER_SOURCE="local"
```

Execute as duas etapas na mesma pasta:

```bash
python scraper.py --ano 2026 --periodo 1 --output dados_sigaa.json
python seed.py --input dados_sigaa.json
```

A primeira etapa cria `scraper_runs.status = running`; a segunda define
`success`, `partial` ou `failed` depois dos upserts.

## 4. Validação

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
python -m compileall scraper
python -m unittest discover -s scraper/tests
python -m pytest
```

`pytest` é opcional se não estiver instalado; os testes Python usam `unittest` e
podem ser executados sem adicionar uma nova stack.
