ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS evidence_details JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE findings
SET evidence_details = '{}'::jsonb
WHERE evidence_details IS NULL;
