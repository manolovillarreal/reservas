-- Migration: reservation status expansion and checkin/checkout/finalization columns
-- Adds physical action columns and expands the status check constraint to include 'finalized'

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS checkin_at         timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_date       timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_notes      text,
  ADD COLUMN IF NOT EXISTS checkout_at        timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_date      timestamptz,
  ADD COLUMN IF NOT EXISTS finalization_notes text,
  ADD COLUMN IF NOT EXISTS finalization_reason text,
  ADD COLUMN IF NOT EXISTS finalized_at       timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_date     timestamptz;

-- Drop and recreate the status check constraint to allow the new 'finalized' value
ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('confirmed', 'in_stay', 'completed', 'finalized', 'cancelled'));
