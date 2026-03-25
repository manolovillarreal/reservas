ALTER TABLE IF EXISTS message_settings
  ADD COLUMN IF NOT EXISTS show_unit_count boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_unit_name boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_unit_description boolean DEFAULT false;
