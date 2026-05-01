# MUSG Constitution AI

**Live at [musgconstitution.com](https://musgconstitution.com)**

> Demo access — Username: `resumeDemo` · Password: `ViewMyWork!`

AI-powered governance tools built for the Marquette University Student Government (MUSG). The platform gives committee chairs and administrators a suite of tools to work with the MUSG constitution and legislative process — from asking plain-English questions to drafting formal bills.

---

## Features

### AI Assistant
Chat with an AI that has deep knowledge of the MUSG Constitution and all governing documents (By-Laws, Election Rules, Financial Policies, Senate Standing Rules, and more). Answers are cited to specific articles and sections, and each response includes a confidence rating (High / Medium / Low) based on how directly the documents support the answer.

### Amendment Validator
Upload or paste a proposed amendment and get a full constitutional compliance check — verifying article citations, placement within the constitutional structure, conflicts with existing provisions, and adherence to amendment procedures under Article VIII.

### Weakness Analyzer
Scans the constitution for vague, unenforceable, or contradictory language. Findings can be saved and passed directly into the Bill Writer to draft corrective legislation.

### Bill Writer
Describe a policy goal in plain English and receive a complete, formally-styled MUSG legislative bill — filled out to the official Senate template with whereas clauses, resolution language, and signature blocks. Export as `.docx` for immediate submission.

### Constitution Viewer
Read and download the full MUSG Constitution as a PDF.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| Backend | Supabase (Postgres + Edge Functions) |
| AI | OpenAI-compatible API (configurable provider) |
| Auth | Supabase Auth with admin approval flow |

---

## Architecture

The app is a single-page React shell with tab-based navigation. All AI calls go through Supabase Edge Functions (Deno), which handle:

- **Rate limiting** — 10 requests/min per IP
- **Global token budget** — 500,000 token cap across all AI calls (~$5 ceiling) enforced via a Postgres atomic counter
- **RLS lockdown** — the token budget table and increment function are inaccessible to anon/authenticated roles; only the service role used by edge functions can touch them

Constitution Q&A uses pgvector for retrieval-augmented generation. Chat history is persisted per conversation in Supabase.

---

## Local Development

```sh
git clone https://github.com/JacobRicard/musegov-insight.git
cd musegov-insight
npm install
```

Copy `.env.example` to `.env` and fill in your values:

```sh
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

```sh
npm run dev
```

### Edge Functions

```sh
supabase functions deploy
```

Set the following secrets in your Supabase project:

| Secret | Description |
|---|---|
| `AI_API_KEY` | API key for your AI provider |
| `LM_STUDIO_BASE_URL` | Base URL of your OpenAI-compatible endpoint |
| `LM_STUDIO_MODEL` | Model name to use |
