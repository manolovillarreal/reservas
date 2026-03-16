-- Migration: Protect historical reservation links from cascading unit deletion
-- Date: 2026-03-14 19:30

ALTER TABLE reservation_units
DROP CONSTRAINT IF EXISTS reservation_units_unit_id_fkey;

ALTER TABLE reservation_units
ADD CONSTRAINT reservation_units_unit_id_fkey
FOREIGN KEY (unit_id)
REFERENCES units(id)
ON DELETE RESTRICT;
