-- Migration: Normalize source_details — system global channels + account_source_settings
-- Date: 2026-04-06

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Make source_types.account_id nullable (to support global system types)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE source_types ALTER COLUMN account_id DROP NOT NULL;

-- Partial unique index: system types are uniquely identified by name (where account_id IS NULL)
-- Required for ON CONFLICT to work, since normal UNIQUE ignores NULL comparisons in PostgreSQL
CREATE UNIQUE INDEX IF NOT EXISTS source_types_system_name_idx
  ON source_types (name) WHERE account_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Update RLS for source_types
--    Split into 4 separate policies so SELECT can allow NULL account_id
--    without letting INSERT/UPDATE/DELETE also bypass per-account isolation
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS source_types_account_isolation ON source_types;
DROP POLICY IF EXISTS source_types_select             ON source_types;
DROP POLICY IF EXISTS source_types_insert             ON source_types;
DROP POLICY IF EXISTS source_types_update             ON source_types;
DROP POLICY IF EXISTS source_types_delete             ON source_types;

CREATE POLICY source_types_select ON source_types
  FOR SELECT TO authenticated
  USING (account_id IS NULL OR account_id = current_account_id());

CREATE POLICY source_types_insert ON source_types
  FOR INSERT TO authenticated
  WITH CHECK (account_id = current_account_id());

CREATE POLICY source_types_update ON source_types
  FOR UPDATE TO authenticated
  USING  (account_id = current_account_id())
  WITH CHECK (account_id = current_account_id());

CREATE POLICY source_types_delete ON source_types
  FOR DELETE TO authenticated
  USING (account_id = current_account_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Insert 4 global source types (account_id = NULL)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO source_types (account_id, name, label_es, is_active)
VALUES
  (NULL, 'direct',   'Directo',   true),
  (NULL, 'ota',      'OTA',       true),
  (NULL, 'social',   'Social',    true),
  (NULL, 'referral', 'Referidos', true)
ON CONFLICT (name) WHERE account_id IS NULL DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Add new columns to source_details + make account_id nullable
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE source_details
  ADD COLUMN IF NOT EXISTS is_system  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_other   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE source_details ALTER COLUMN account_id DROP NOT NULL;

-- Partial unique index for system details (ON CONFLICT requires this)
CREATE UNIQUE INDEX IF NOT EXISTS source_details_system_name_idx
  ON source_details (name) WHERE is_system = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Update RLS for source_details
--    INSERT/UPDATE/DELETE block system records (is_system = true)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS source_details_account_isolation  ON source_details;
DROP POLICY IF EXISTS source_details_select             ON source_details;
DROP POLICY IF EXISTS source_details_insert             ON source_details;
DROP POLICY IF EXISTS source_details_update             ON source_details;
DROP POLICY IF EXISTS source_details_delete             ON source_details;
DROP POLICY IF EXISTS "no_insert_system_sources"        ON source_details;

CREATE POLICY source_details_select ON source_details
  FOR SELECT TO authenticated
  USING (account_id IS NULL OR account_id = current_account_id());

CREATE POLICY "no_insert_system_sources" ON source_details
  FOR INSERT TO authenticated
  WITH CHECK (account_id = current_account_id() AND is_system = false);

CREATE POLICY source_details_update ON source_details
  FOR UPDATE TO authenticated
  USING  (account_id = current_account_id() AND is_system = false)
  WITH CHECK (account_id = current_account_id() AND is_system = false);

CREATE POLICY source_details_delete ON source_details
  FOR DELETE TO authenticated
  USING (account_id = current_account_id() AND is_system = false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Insert 17 system source_details
--    Source type UUIDs resolved via subquery (no hardcoded IDs)
-- ─────────────────────────────────────────────────────────────────────────────

-- Directo (5 channels)
INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'presencial', 'Presencial', true, false, 1, true, 0, 0
FROM source_types st WHERE st.name = 'direct' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'sitio_web', 'Sitio web', true, false, 2, true, 0, 0
FROM source_types st WHERE st.name = 'direct' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'recomendado', 'Recomendado', true, false, 3, true, 0, 0
FROM source_types st WHERE st.name = 'direct' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'google_maps', 'Google Maps', true, false, 4, true, 0, 0
FROM source_types st WHERE st.name = 'direct' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'directo_otro', 'Otro', true, true, 5, true, 0, 0
FROM source_types st WHERE st.name = 'direct' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

-- OTA (5 channels)
INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'airbnb', 'Airbnb', true, false, 1, true, 0, 0
FROM source_types st WHERE st.name = 'ota' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'booking', 'Booking.com', true, false, 2, true, 0, 0
FROM source_types st WHERE st.name = 'ota' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'despegar', 'Despegar', true, false, 3, true, 0, 0
FROM source_types st WHERE st.name = 'ota' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'trivago', 'Trivago', true, false, 4, true, 0, 0
FROM source_types st WHERE st.name = 'ota' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'ota_otro', 'Otro', true, true, 5, true, 0, 0
FROM source_types st WHERE st.name = 'ota' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

-- Social (5 channels)
INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'instagram', 'Instagram', true, false, 1, true, 0, 0
FROM source_types st WHERE st.name = 'social' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'facebook', 'Facebook', true, false, 2, true, 0, 0
FROM source_types st WHERE st.name = 'social' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'tiktok', 'TikTok', true, false, 3, true, 0, 0
FROM source_types st WHERE st.name = 'social' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'x', 'X (Twitter)', true, false, 4, true, 0, 0
FROM source_types st WHERE st.name = 'social' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'social_otro', 'Otro', true, true, 5, true, 0, 0
FROM source_types st WHERE st.name = 'social' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

-- Referidos (2 channels)
INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'agencia', 'Agencia', true, false, 1, true, 0, 0
FROM source_types st WHERE st.name = 'referral' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

INSERT INTO source_details (account_id, source_type_id, name, label_es, is_system, is_other, sort_order, is_active, suggested_commission_percentage, suggested_discount_percentage)
SELECT NULL, st.id, 'referral_otro', 'Otro', true, true, 2, true, 0, 0
FROM source_types st WHERE st.name = 'referral' AND st.account_id IS NULL
ON CONFLICT (name) WHERE is_system = true DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Add source_name column to reservations and inquiries
--    source_detail_id already exists in both tables → ADD COLUMN IF NOT EXISTS is a safe no-op
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS source_detail_id uuid REFERENCES source_details(id),
  ADD COLUMN IF NOT EXISTS source_name text;

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS source_detail_id uuid REFERENCES source_details(id),
  ADD COLUMN IF NOT EXISTS source_name text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Create account_source_settings
--    Stores per-account overrides for system channels (is_active + commission_pct)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_source_settings (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       uuid         NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_detail_id uuid         NOT NULL REFERENCES source_details(id) ON DELETE CASCADE,
  is_active        boolean      NOT NULL DEFAULT true,
  commission_pct   numeric(5,2) NOT NULL DEFAULT 0,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (account_id, source_detail_id)
);

ALTER TABLE account_source_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_source_settings_access ON account_source_settings;
CREATE POLICY account_source_settings_access ON account_source_settings
  FOR ALL TO authenticated
  USING  (account_id = current_account_id())
  WITH CHECK (account_id = current_account_id());

CREATE INDEX IF NOT EXISTS account_source_settings_account_idx
  ON account_source_settings (account_id);
