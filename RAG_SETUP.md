# AI & RAG Architecture

This document describes how the AI features work, what data sources they use, and how to configure them.

---

## How Constitution Q&A Works

The AI Assistant, Amendment Validator, and Weakness Analyzer do **not** use a vector store for the constitution itself. Instead, the full text of all MUSG governing documents is bundled directly in `src/data/constitution.ts` and injected into the system prompt on every request (up to 150,000 characters).

This approach was chosen over OpenAI's vector store (which was previously used and has since been decommissioned) because:
- The combined governing documents fit comfortably within modern context windows
- No external setup or API dependency is required
- Citations are more reliable when the model sees the full document

### Documents included

All PDFs live in `public/documents/` and their text is compiled into `src/data/constitution.ts`:

| File | Contents |
|---|---|
| `CONSTITUTION.pdf` | Main MUSG Constitution |
| `CONSTITUTION_BY-LAWS.pdf` | Constitutional By-Laws |
| `BUDGET_APPROVAL_PROCEDURES.pdf` | Budget approval rules |
| `ELECTION_RULES.pdf` | Election procedures |
| `FINANCIAL_POLICIES.pdf` | Financial governance |
| `SENATE_STANDING_RULES.pdf` | Senate operating rules |
| `SENIOR_SPEAKER_SELECTION_PROCEDURES.pdf` | Speaker selection |
| `UNIVERSITY_COMMITTEE_STUDENT_REPRESENTATION_PROCEDURES.pdf` | Committee representation |

To update documents: replace the PDFs and regenerate `src/data/constitution.ts` with the new text.

---

## Precedent Articles (pgvector RAG)

The `scrape-articles` edge function scrapes MUSG-relevant news from Marquette Wire and `today.marquette.edu`, generates embeddings, and stores them in Supabase for semantic search.

### Pipeline

```
RSS feeds (Marquette Wire + today.marquette.edu)
  → filter MUSG-relevant articles
  → fetch full article HTML
  → extract plain text (up to 6,000 chars)
  → embed with text-embedding-3-small (OpenAI)
  → upsert into precedent_articles table (pgvector, 1536-dim)
```

### Similarity search

The `search_precedent_articles` Postgres function performs cosine similarity search via an IVFFlat index:

```sql
SELECT * FROM search_precedent_articles(
  query_embedding := <1536-dim vector>,
  match_threshold := 0.70,
  match_count     := 4
);
```

### Running the scraper

The scraper is an admin-only edge function — it is not triggered from the UI. To run it:

```sh
curl -X POST https://<project-ref>.supabase.co/functions/v1/scrape-articles \
  -H "Authorization: Bearer <service-role-key>"
```

---

## AI Provider Configuration

All AI calls use an OpenAI-compatible chat completions endpoint, configured via environment variables. This makes it easy to swap providers without changing code.

| Secret | Description | Example |
|---|---|---|
| `LM_STUDIO_BASE_URL` | Base URL of your AI endpoint | `https://api.groq.com/openai/v1` |
| `AI_API_KEY` | API key (leave unset for local LM Studio) | `gsk_...` |
| `LM_STUDIO_MODEL` | Model name to request | `llama-3.1-70b-versatile` |

**Local development**: point `LM_STUDIO_BASE_URL` at a running LM Studio instance (`http://127.0.0.1:1234/v1`) and omit the API key.

**Production**: set these as Supabase edge function secrets.

---

## Spending Limits

A global token counter in the `ai_usage` table caps cumulative AI usage at **500,000 tokens** (~$5 at GPT-4o pricing). Both `analyze-constitution` and `generate-bill` check this before calling the AI and record actual usage from the API response afterward. The counter can be reset with:

```sql
UPDATE ai_usage SET total_tokens = 0 WHERE id = 1;
```
