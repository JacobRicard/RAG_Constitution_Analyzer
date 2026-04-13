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


