-- Migration: document settings customization per account
-- Date: 2026-03-19

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS document_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) NOT NULL UNIQUE,
  color_theme text DEFAULT 'tekmi',
  color_primary text DEFAULT '#2D1B69',
  color_accent text DEFAULT '#4C2FFF',
  color_background text DEFAULT '#F8F9FC',
  header_layout integer DEFAULT 1,
  header_show_logo boolean DEFAULT true,
  header_logo_size text DEFAULT 'medium',
  header_fields jsonb DEFAULT '{}'::jsonb,
  header_extra_text text,
  footer_layout integer DEFAULT 1,
  footer_fields jsonb DEFAULT '{}'::jsonb,
  footer_free_text text,
  show_conditions boolean DEFAULT true,
  custom_field_label text,
  custom_field_content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS document_settings
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id),
  ADD COLUMN IF NOT EXISTS color_theme text DEFAULT 'tekmi',
  ADD COLUMN IF NOT EXISTS color_primary text DEFAULT '#2D1B69',
  ADD COLUMN IF NOT EXISTS color_accent text DEFAULT '#4C2FFF',
  ADD COLUMN IF NOT EXISTS color_background text DEFAULT '#F8F9FC',
  ADD COLUMN IF NOT EXISTS header_layout integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS header_show_logo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS header_logo_size text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS header_fields jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS header_extra_text text,
  ADD COLUMN IF NOT EXISTS footer_layout integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS footer_fields jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS footer_free_text text,
  ADD COLUMN IF NOT EXISTS show_conditions boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_field_label text,
  ADD COLUMN IF NOT EXISTS custom_field_content text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF to_regclass('public.document_settings') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'document_settings_pkey'
        AND conrelid = 'document_settings'::regclass
    ) THEN
      ALTER TABLE document_settings
        ADD CONSTRAINT document_settings_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'document_settings_account_id_key'
        AND conrelid = 'document_settings'::regclass
    ) THEN
      ALTER TABLE document_settings
        ADD CONSTRAINT document_settings_account_id_key UNIQUE (account_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'document_settings_account_id_fkey'
        AND conrelid = 'document_settings'::regclass
    ) THEN
      ALTER TABLE document_settings
        ADD CONSTRAINT document_settings_account_id_fkey
        FOREIGN KEY (account_id) REFERENCES accounts(id);
    END IF;

    ALTER TABLE document_settings
      ALTER COLUMN account_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS document_settings_account_id_idx ON document_settings (account_id);

DO $$
BEGIN
  IF to_regclass('public.document_settings') IS NOT NULL AND to_regclass('public.update_updated_at_column') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_document_settings_updated_at ON document_settings;
    CREATE TRIGGER update_document_settings_updated_at
    BEFORE UPDATE ON document_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE IF EXISTS document_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_settings_account_isolation ON document_settings;
CREATE POLICY document_settings_account_isolation ON document_settings
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

INSERT INTO document_settings (account_id)
SELECT id FROM accounts
WHERE slug = 'marmanu-house'
ON CONFLICT (account_id) DO NOTHING;
