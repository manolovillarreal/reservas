-- Add operational flow settings to the settings table
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS allow_checkin_without_preregistro boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_checkout_without_preregistro boolean NOT NULL DEFAULT false;