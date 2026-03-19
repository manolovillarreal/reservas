-- Migration: preregistro/checkin hardening and guest identity indexes
-- Date: 2026-03-18

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE IF EXISTS reservations
  ADD COLUMN IF NOT EXISTS preregistro_completado boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS preregistro_completado_at timestamptz,
  ADD COLUMN IF NOT EXISTS preregistro_token text,
  ADD COLUMN IF NOT EXISTS preregistro_token_expiry timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS reservations_preregistro_token_unique_idx
  ON reservations (preregistro_token)
  WHERE preregistro_token IS NOT NULL;

ALTER TABLE IF EXISTS guests
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS document_number text;

DO $$
BEGIN
  IF to_regclass('public.guests') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'guests_document_type_check'
        AND conrelid = 'public.guests'::regclass
    ) THEN
    ALTER TABLE guests
      ADD CONSTRAINT guests_document_type_check
      CHECK (document_type IN ('passport', 'cedula', 'dni', 'foreign_id') OR document_type IS NULL);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_document
  ON guests (account_id, document_type, document_number)
  WHERE document_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS reservation_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE NOT NULL,
  guest_id uuid REFERENCES guests(id) NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  account_id uuid REFERENCES accounts(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS reservation_guests
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE reservation_guests rg
SET account_id = r.account_id
FROM reservations r
WHERE rg.reservation_id = r.id
  AND rg.account_id IS NULL;

ALTER TABLE IF EXISTS reservation_guests
  ALTER COLUMN account_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reservation_guests_id_unique_idx
  ON reservation_guests (id);

CREATE UNIQUE INDEX IF NOT EXISTS reservation_guests_unique_pair_idx
  ON reservation_guests (reservation_id, guest_id);

CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_per_reservation
  ON reservation_guests (reservation_id)
  WHERE is_primary = true;

ALTER TABLE IF EXISTS reservation_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reservation_guests_account_isolation ON reservation_guests;
CREATE POLICY reservation_guests_account_isolation ON reservation_guests
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());
