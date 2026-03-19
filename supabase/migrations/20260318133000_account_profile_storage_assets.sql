-- Migration: account profile, reference prefix helpers, and account assets bucket
-- Date: 2026-03-18

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Converts an account UUID to an account-specific 4-char prefix using a base36 transformation
-- and removing ambiguous chars: 0, 1, I, O.
CREATE OR REPLACE FUNCTION generate_account_prefix(account_uuid uuid)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  hex_value text;
  digit_char text;
  digit_int int;
  value_num numeric := 0;
  base36_chars constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  base36_text text := '';
  filtered text;
  remainder_num numeric;
BEGIN
  IF account_uuid IS NULL THEN
    RETURN NULL;
  END IF;

  hex_value := replace(account_uuid::text, '-', '');

  FOR i IN 1..length(hex_value) LOOP
    digit_char := substr(hex_value, i, 1);

    IF digit_char BETWEEN '0' AND '9' THEN
      digit_int := ascii(digit_char) - ascii('0');
    ELSE
      digit_int := ascii(upper(digit_char)) - ascii('A') + 10;
    END IF;

    value_num := value_num * 16 + digit_int;
  END LOOP;

  IF value_num = 0 THEN
    base36_text := '0';
  ELSE
    WHILE value_num > 0 LOOP
      remainder_num := mod(value_num, 36);
      base36_text := substr(base36_chars, remainder_num::int + 1, 1) || base36_text;
      value_num := trunc(value_num / 36);
    END LOOP;
  END IF;

  filtered := regexp_replace(upper(base36_text), '[01IO]', '', 'g');
  filtered := substr(rpad(filtered, 4, '2'), 1, 4);

  RETURN filtered;
END;
$$;

-- Compatibility alias requested by product spec.
CREATE OR REPLACE FUNCTION "generateAccountPrefix"(account_uuid uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT generate_account_prefix(account_uuid)
$$;

GRANT EXECUTE ON FUNCTION generate_account_prefix(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "generateAccountPrefix"(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS account_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) NOT NULL UNIQUE,
  commercial_name text,
  legal_name text,
  nit text,
  nit_digit integer,
  address text,
  city text,
  department text,
  country text DEFAULT 'Colombia',
  phone text,
  email text,
  website text,
  slogan text,
  logo_url text,
  reference_prefix text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF to_regclass('public.account_profile') IS NOT NULL AND to_regclass('public.update_updated_at_column') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_account_profile_updated_at ON account_profile;
    CREATE TRIGGER update_account_profile_updated_at
    BEFORE UPDATE ON account_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE IF EXISTS account_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_profile_account_isolation ON account_profile;
CREATE POLICY account_profile_account_isolation ON account_profile
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

-- Ensure bucket exists and remains public-read with strict upload constraints.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'account-assets',
  'account-assets',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS account_assets_public_read ON storage.objects;
CREATE POLICY account_assets_public_read ON storage.objects
FOR SELECT
USING (bucket_id = 'account-assets');

DROP POLICY IF EXISTS account_assets_insert ON storage.objects;
CREATE POLICY account_assets_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'account-assets'
  AND split_part(name, '/', 1) = 'accounts'
  AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  AND EXISTS (
    SELECT 1
    FROM account_users au
    WHERE au.user_id = auth.uid()
      AND au.account_id::text = split_part(name, '/', 2)
  )
);

DROP POLICY IF EXISTS account_assets_update ON storage.objects;
CREATE POLICY account_assets_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'account-assets'
  AND split_part(name, '/', 1) = 'accounts'
  AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  AND EXISTS (
    SELECT 1
    FROM account_users au
    WHERE au.user_id = auth.uid()
      AND au.account_id::text = split_part(name, '/', 2)
  )
)
WITH CHECK (
  bucket_id = 'account-assets'
  AND split_part(name, '/', 1) = 'accounts'
  AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  AND EXISTS (
    SELECT 1
    FROM account_users au
    WHERE au.user_id = auth.uid()
      AND au.account_id::text = split_part(name, '/', 2)
  )
);

DROP POLICY IF EXISTS account_assets_delete ON storage.objects;
CREATE POLICY account_assets_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'account-assets'
  AND split_part(name, '/', 1) = 'accounts'
  AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  AND EXISTS (
    SELECT 1
    FROM account_users au
    WHERE au.user_id = auth.uid()
      AND au.account_id::text = split_part(name, '/', 2)
  )
);

INSERT INTO account_profile (account_id, commercial_name, country, reference_prefix)
SELECT id, 'Marmanu House', 'Colombia', "generateAccountPrefix"(id)
FROM accounts
WHERE slug = 'marmanu-house'
ON CONFLICT (account_id) DO NOTHING;
