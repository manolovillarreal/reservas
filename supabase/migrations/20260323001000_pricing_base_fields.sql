-- Pricing base fields alignment (idempotent, partial-safe)

CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE IF EXISTS units
  ADD COLUMN IF NOT EXISTS price_base numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_min numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_extra_person numeric(10,2);

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE IF EXISTS settings
  ADD COLUMN IF NOT EXISTS price_general_base numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_general_min numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_general_extra numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_per_person_base numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_weekend_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS price_peak_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS price_child_pct numeric(5,2) DEFAULT 50,
  ADD COLUMN IF NOT EXISTS price_full_house_min numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_full_house_base numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_full_house_peak numeric(10,2);
