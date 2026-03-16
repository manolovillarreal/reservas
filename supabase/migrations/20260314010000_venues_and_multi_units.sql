-- Migration: Add venues and multi-unit reservations
-- Date: 2026-03-14

-- 1. Create venues table
CREATE TABLE venues (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    address text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Seed default venue
INSERT INTO venues (name, description)
VALUES ('Marmanu House Principal', 'Sede principal de Marmanu House');

-- 3. Add venue_id to units and backfill
ALTER TABLE units ADD COLUMN venue_id uuid REFERENCES venues(id) ON DELETE CASCADE;

UPDATE units
SET venue_id = (SELECT id FROM venues WHERE name = 'Marmanu House Principal')
WHERE venue_id IS NULL;

ALTER TABLE units ALTER COLUMN venue_id SET NOT NULL;

-- 4. Add venue_id to reservations and backfill using old unit_id relation
ALTER TABLE reservations ADD COLUMN venue_id uuid REFERENCES venues(id);

UPDATE reservations r
SET venue_id = u.venue_id
FROM units u
WHERE r.unit_id = u.id;

ALTER TABLE reservations ALTER COLUMN venue_id SET NOT NULL;

-- 5. Create reservation_units and backfill from existing reservations.unit_id
CREATE TABLE reservation_units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE NOT NULL,
    unit_id uuid REFERENCES units(id) ON DELETE RESTRICT NOT NULL,
    created_at timestamptz DEFAULT now()
);

INSERT INTO reservation_units (reservation_id, unit_id)
SELECT id, unit_id
FROM reservations
WHERE unit_id IS NOT NULL;

-- 6. Remove old single-unit column from reservations
ALTER TABLE reservations DROP COLUMN unit_id;

-- 7. Add trigger and RLS for new tables
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access venues" ON venues FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access reservation_units" ON reservation_units FOR ALL TO authenticated USING (true) WITH CHECK (true);