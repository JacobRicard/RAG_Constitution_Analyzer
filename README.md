# musegov-insight

AI-powered governance tools for the Marquette University Student Government (MUSG). Includes bill drafting, amendment management, constitution analysis, and weakness detection — all backed by Supabase and OpenAI.

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (database + edge functions)
- OpenAI gpt-4o-mini

## Local development

### 1. Clone and install

```sh
git clone https://github.com/JacobRicard/musegov-insight.git
cd musegov-insight
npm install
```

### 2. Configure environment variables

**Never commit `.env` to git.** Copy the example file and fill in your values:

```sh
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |
| `VITE_SITE_PASSWORD` | Password gate for the app |

Get these from the [Supabase dashboard](https://app.supabase.com) under **Project Settings → API**.

### 3. Run the dev server

```sh
npm run dev
```

## Supabase edge functions

Edge functions live in `supabase/functions/`. To deploy:

```sh
supabase functions deploy
```

Secrets (OpenAI API key, etc.) are set via:

```sh
supabase secrets set OPENAI_API_KEY=...
```

## Deployment

The app is deployed to Vercel. Push to `main` triggers a production deploy automatically.

## Security

- `.env` is in `.gitignore` — **do not remove this**.
- If credentials are ever accidentally committed, rotate them immediately in the Supabase dashboard and regenerate your OpenAI API key.
- The site password gate is a lightweight access control layer; do not store sensitive data in frontend code.
