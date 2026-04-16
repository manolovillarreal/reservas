ALTER TABLE IF EXISTS account_profile
  ADD COLUMN IF NOT EXISTS common_amenities text;

UPDATE account_profile
SET common_amenities = short_description
WHERE common_amenities IS NULL
  AND NULLIF(trim(short_description), '') IS NOT NULL;