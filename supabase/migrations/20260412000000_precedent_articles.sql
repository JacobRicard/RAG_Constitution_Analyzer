-- ─── pgvector extension ───────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Precedent articles table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.precedent_articles (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  url          TEXT        UNIQUE NOT NULL,
  title        TEXT        NOT NULL,
  source       TEXT        NOT NULL CHECK (source IN ('marquette_wire', 'today_marquette')),
  content      TEXT        NOT NULL,
  published_at TIMESTAMPTZ,
  scraped_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  embedding    VECTOR(1536)          -- OpenAI text-embedding-3-small
);

-- IVFFlat index for fast cosine-similarity search
-- (lists = 100 is appropriate for up to ~1 M rows; fine for hundreds of articles)
CREATE INDEX IF NOT EXISTS precedent_articles_embedding_idx
  ON public.precedent_articles
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.precedent_articles ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read articles — they're public news
CREATE POLICY "Public read precedent articles"
  ON public.precedent_articles
  FOR SELECT USING (true);

-- Only the service role (edge functions) can insert / update / delete
CREATE POLICY "Service role manages precedent articles"
  ON public.precedent_articles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── Similarity search RPC ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_precedent_articles(
  query_embedding VECTOR(1536),
  match_threshold FLOAT   DEFAULT 0.70,
  match_count     INT     DEFAULT 4
)
RETURNS TABLE (
  id           UUID,
  title        TEXT,
  source       TEXT,
  url          TEXT,
  content      TEXT,
  published_at TIMESTAMPTZ,
  similarity   FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    title,
    source,
    url,
    content,
    published_at,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.precedent_articles
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
