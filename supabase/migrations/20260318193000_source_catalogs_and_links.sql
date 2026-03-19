-- Migration: source catalogs and source linkage for reservations/inquiries
-- Date: 2026-03-18

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS source_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) NOT NULL,
  name text NOT NULL,
  label_es text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_source_type_per_account UNIQUE (account_id, name)
);

CREATE TABLE IF NOT EXISTS source_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) NOT NULL,
  source_type_id uuid REFERENCES source_types(id) NOT NULL,
  name text NOT NULL,
  label_es text NOT NULL,
  suggested_commission_percentage numeric(5,2) NOT NULL DEFAULT 0,
  suggested_discount_percentage numeric(5,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_source_detail_per_account UNIQUE (account_id, source_type_id, name)
);

DO $$
BEGIN
  IF to_regclass('public.source_types') IS NOT NULL AND to_regclass('public.update_updated_at_column') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_source_types_updated_at ON source_types;
    CREATE TRIGGER update_source_types_updated_at
    BEFORE UPDATE ON source_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF to_regclass('public.source_details') IS NOT NULL AND to_regclass('public.update_updated_at_column') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_source_details_updated_at ON source_details;
    CREATE TRIGGER update_source_details_updated_at
    BEFORE UPDATE ON source_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE IF EXISTS source_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS source_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS source_types_account_isolation ON source_types;
CREATE POLICY source_types_account_isolation ON source_types
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS source_details_account_isolation ON source_details;
CREATE POLICY source_details_account_isolation ON source_details
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

CREATE INDEX IF NOT EXISTS source_types_account_id_idx ON source_types (account_id);
CREATE INDEX IF NOT EXISTS source_types_account_active_label_idx ON source_types (account_id, is_active, label_es);
CREATE INDEX IF NOT EXISTS source_details_account_id_idx ON source_details (account_id);
CREATE INDEX IF NOT EXISTS source_details_type_active_label_idx ON source_details (account_id, source_type_id, is_active, label_es);

ALTER TABLE IF EXISTS reservations
  ADD COLUMN IF NOT EXISTS source_type_id uuid REFERENCES source_types(id),
  ADD COLUMN IF NOT EXISTS source_detail_id uuid REFERENCES source_details(id),
  ADD COLUMN IF NOT EXISTS discount_percentage numeric(5,2) NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS inquiries
  ADD COLUMN IF NOT EXISTS source_type_id uuid REFERENCES source_types(id),
  ADD COLUMN IF NOT EXISTS source_detail_id uuid REFERENCES source_details(id),
  ADD COLUMN IF NOT EXISTS price_per_night numeric(10,2),
  ADD COLUMN IF NOT EXISTS commission_name text,
  ADD COLUMN IF NOT EXISTS commission_percentage numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percentage numeric(5,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS reservations_source_type_id_idx ON reservations (source_type_id);
CREATE INDEX IF NOT EXISTS reservations_source_detail_id_idx ON reservations (source_detail_id);
CREATE INDEX IF NOT EXISTS inquiries_source_type_id_idx ON inquiries (source_type_id);
CREATE INDEX IF NOT EXISTS inquiries_source_detail_id_idx ON inquiries (source_detail_id);

WITH target_accounts AS (
  SELECT id
  FROM accounts
  WHERE slug = 'marmanu-house'
), seeded_types AS (
  INSERT INTO source_types (account_id, name, label_es)
  SELECT ta.id, source_type.name, source_type.label_es
  FROM target_accounts ta
  CROSS JOIN (
    VALUES
      ('direct', 'Directo'),
      ('ota', 'OTA'),
      ('social', 'Redes Sociales'),
      ('referral', 'Referido'),
      ('other', 'Otro')
  ) AS source_type(name, label_es)
  ON CONFLICT (account_id, name) DO UPDATE
  SET label_es = EXCLUDED.label_es
  RETURNING id, account_id, name
), all_types AS (
  SELECT id, account_id, name
  FROM seeded_types

  UNION ALL

  SELECT st.id, st.account_id, st.name
  FROM source_types st
  JOIN target_accounts ta ON ta.id = st.account_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM seeded_types seeded
    WHERE seeded.id = st.id
  )
)
INSERT INTO source_details (
  account_id,
  source_type_id,
  name,
  label_es,
  suggested_commission_percentage,
  suggested_discount_percentage
)
SELECT
  source_type.account_id,
  source_type.id,
  source_detail.name,
  source_detail.label_es,
  source_detail.suggested_commission_percentage,
  source_detail.suggested_discount_percentage
FROM all_types source_type
JOIN (
  VALUES
    ('direct', 'whatsapp', 'WhatsApp', 0::numeric, 0::numeric),
    ('direct', 'phone', 'Telefono', 0::numeric, 0::numeric),
    ('direct', 'walk_in', 'Walk-in', 0::numeric, 0::numeric),
    ('ota', 'airbnb', 'Airbnb', 15::numeric, 0::numeric),
    ('ota', 'booking', 'Booking', 18::numeric, 0::numeric),
    ('social', 'instagram', 'Instagram', 0::numeric, 0::numeric),
    ('social', 'facebook', 'Facebook', 0::numeric, 0::numeric),
    ('referral', 'referral', 'Referido', 0::numeric, 0::numeric),
    ('other', 'manual', 'Manual', 0::numeric, 0::numeric),
    ('other', 'website', 'Sitio web', 0::numeric, 0::numeric)
) AS source_detail(source_type_name, name, label_es, suggested_commission_percentage, suggested_discount_percentage)
  ON source_detail.source_type_name = source_type.name
ON CONFLICT (account_id, source_type_id, name) DO UPDATE
SET
  label_es = EXCLUDED.label_es,
  suggested_commission_percentage = EXCLUDED.suggested_commission_percentage,
  suggested_discount_percentage = EXCLUDED.suggested_discount_percentage;

WITH detail_mapping AS (
  SELECT
    st.account_id,
    st.id AS source_type_id,
    sd.id AS source_detail_id,
    legacy.source_value
  FROM source_types st
  JOIN source_details sd
    ON sd.account_id = st.account_id
   AND sd.source_type_id = st.id
  JOIN (
    VALUES
      ('whatsapp', 'direct', 'whatsapp'),
      ('telefono', 'direct', 'phone'),
      ('phone', 'direct', 'phone'),
      ('walk_in', 'direct', 'walk_in'),
      ('instagram', 'social', 'instagram'),
      ('facebook', 'social', 'facebook'),
      ('directo', 'other', 'manual'),
      ('website', 'other', 'website'),
      ('manual', 'other', 'manual')
  ) AS legacy(source_value, type_name, detail_name)
    ON legacy.type_name = st.name
   AND legacy.detail_name = sd.name
)
UPDATE reservations r
SET
  source_type_id = dm.source_type_id,
  source_detail_id = dm.source_detail_id
FROM detail_mapping dm
WHERE r.account_id = dm.account_id
  AND lower(coalesce(r.source, '')) = dm.source_value
  AND (r.source_type_id IS NULL OR r.source_detail_id IS NULL);

WITH detail_mapping AS (
  SELECT
    st.account_id,
    st.id AS source_type_id,
    sd.id AS source_detail_id,
    legacy.source_value
  FROM source_types st
  JOIN source_details sd
    ON sd.account_id = st.account_id
   AND sd.source_type_id = st.id
  JOIN (
    VALUES
      ('whatsapp', 'direct', 'whatsapp'),
      ('telefono', 'direct', 'phone'),
      ('phone', 'direct', 'phone'),
      ('walk_in', 'direct', 'walk_in'),
      ('instagram', 'social', 'instagram'),
      ('facebook', 'social', 'facebook'),
      ('directo', 'other', 'manual'),
      ('website', 'other', 'website'),
      ('manual', 'other', 'manual')
  ) AS legacy(source_value, type_name, detail_name)
    ON legacy.type_name = st.name
   AND legacy.detail_name = sd.name
)
UPDATE inquiries i
SET
  source_type_id = dm.source_type_id,
  source_detail_id = dm.source_detail_id
FROM detail_mapping dm
WHERE i.account_id = dm.account_id
  AND lower(coalesce(i.source, '')) = dm.source_value
  AND (i.source_type_id IS NULL OR i.source_detail_id IS NULL);