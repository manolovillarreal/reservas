-- Add allow_past_dates_in_pickers setting (default true = past dates allowed)
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS allow_past_dates_in_pickers boolean NOT NULL DEFAULT true;

-- Fix allow_checkout_without_preregistro default to true and update existing rows
ALTER TABLE settings
  ALTER COLUMN allow_checkout_without_preregistro SET DEFAULT true;

UPDATE settings
  SET allow_checkout_without_preregistro = true
  WHERE allow_checkout_without_preregistro = false;
