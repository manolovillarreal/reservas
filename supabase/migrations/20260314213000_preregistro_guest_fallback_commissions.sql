-- Migration: Guest fallback, preregistro, reservation guests and commissions
-- Date: 2026-03-14 21:30

ALTER TABLE reservations ALTER COLUMN guest_id DROP NOT NULL;

ALTER TABLE reservations
ADD COLUMN guest_name text,
ADD COLUMN guest_phone text,
ADD COLUMN preregistro_completado boolean NOT NULL DEFAULT false,
ADD COLUMN preregistro_completado_at timestamptz,
ADD COLUMN preregistro_token text UNIQUE,
ADD COLUMN preregistro_token_expiry timestamptz,
ADD COLUMN checkin_at timestamptz,
ADD COLUMN commission_name text,
ADD COLUMN commission_percentage numeric(5,2);

UPDATE reservations r
SET guest_name = g.name,
    guest_phone = g.phone
FROM guests g
WHERE r.guest_id = g.id
  AND (r.guest_name IS NULL OR r.guest_phone IS NULL);

ALTER TABLE reservations
ADD CONSTRAINT reservations_guest_reference_check
CHECK (
  guest_id IS NOT NULL
  OR (guest_name IS NOT NULL AND btrim(guest_name) <> '')
);

ALTER TABLE guests
ADD COLUMN nationality text,
ADD COLUMN document_type text CHECK (document_type IN ('passport', 'cedula', 'dni', 'foreign_id')),
ADD COLUMN document_number text;

UPDATE guests
SET document_number = document
WHERE document IS NOT NULL AND document_number IS NULL;

CREATE UNIQUE INDEX guests_document_identity_unique_idx
ON guests (document_type, document_number)
WHERE document_number IS NOT NULL;

CREATE TABLE reservation_guests (
  reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE NOT NULL,
  guest_id uuid REFERENCES guests(id) ON DELETE RESTRICT NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (reservation_id, guest_id)
);

CREATE UNIQUE INDEX reservation_guests_one_primary_idx
ON reservation_guests (reservation_id)
WHERE is_primary;

INSERT INTO reservation_guests (reservation_id, guest_id, is_primary)
SELECT id, guest_id, true
FROM reservations
WHERE guest_id IS NOT NULL
ON CONFLICT (reservation_id, guest_id) DO NOTHING;

ALTER TABLE reservation_guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access reservation_guests" ON reservation_guests FOR ALL TO authenticated USING (true) WITH CHECK (true);
