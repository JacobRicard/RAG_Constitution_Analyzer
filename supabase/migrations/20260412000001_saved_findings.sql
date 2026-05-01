CREATE TABLE IF NOT EXISTS saved_findings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text        NOT NULL,
  location    text,
  quote       text,
  problem     text,
  risk        text,
  fix         text,
  focus_area  text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE saved_findings ENABLE ROW LEVEL SECURITY;

-- App is password-gated at the application level; allow anon CRUD.
CREATE POLICY "anon_all_saved_findings" ON saved_findings
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
