DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'installations'
  ) THEN
    DELETE FROM installations older
    USING installations newer
    WHERE older.id = newer.id
      AND older.ctid < newer.ctid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'installations_pkey'
  ) THEN
    ALTER TABLE installations
      ADD CONSTRAINT installations_pkey PRIMARY KEY (id);
  END IF;
END $$;
