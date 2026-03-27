ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS internal_type VARCHAR(120);

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS taxonomy_mappings JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS taxonomy_versions JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE findings
SET internal_type = COALESCE(NULLIF(internal_type, ''), rule_id)
WHERE internal_type IS NULL;

UPDATE findings
SET taxonomy_mappings = jsonb_strip_nulls(
  jsonb_build_object(
    'cwe', CASE
      WHEN cwe_id IS NULL OR cwe_id = '' THEN '[]'::jsonb
      ELSE to_jsonb(ARRAY[cwe_id])
    END,
    'owasp', CASE
      WHEN owasp_category IS NULL OR owasp_category = '' THEN '[]'::jsonb
      ELSE to_jsonb(ARRAY[owasp_category])
    END,
    'attack', '[]'::jsonb,
    'capec', '[]'::jsonb
  )
)
WHERE taxonomy_mappings = '{}'::jsonb;

UPDATE findings
SET taxonomy_versions = jsonb_build_object(
  'cwe', '4.18',
  'attack', '17.0',
  'capec', '3.9',
  'owasp', '2021'
)
WHERE taxonomy_versions = '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_findings_internal_type ON findings (internal_type);
CREATE INDEX IF NOT EXISTS idx_findings_taxonomy_mappings ON findings USING GIN (taxonomy_mappings);
