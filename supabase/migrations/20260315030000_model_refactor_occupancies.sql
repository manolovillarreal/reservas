-- Migration: data cleanup + reservation model refactor + occupancies source of truth
-- Date: 2026-03-15 03:00

-- 1) Cleanup test data before structural changes (safe if table exists)
DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.payments CASCADE';
  END IF;
  IF to_regclass('public.reservation_status_logs') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.reservation_status_logs CASCADE';
  END IF;
  IF to_regclass('public.reservation_guests') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.reservation_guests CASCADE';
  END IF;
  IF to_regclass('public.reservation_units') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.reservation_units CASCADE';
  END IF;
  IF to_regclass('public.reservations') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.reservations CASCADE';
  END IF;
  IF to_regclass('public.inquiries') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.inquiries CASCADE';
  END IF;
  IF to_regclass('public.occupancies') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.occupancies CASCADE';
  END IF;
  IF to_regclass('public.room_blocks') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.room_blocks CASCADE';
  END IF;
  IF to_regclass('public.guests') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.guests CASCADE';
  END IF;
  IF to_regclass('public.pricing_seasons') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.pricing_seasons CASCADE';
  END IF;
  IF to_regclass('public.units') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.units CASCADE';
  END IF;
  IF to_regclass('public.settings') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.settings CASCADE';
  END IF;
  IF to_regclass('public.venues') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.venues CASCADE';
  END IF;
END $$;

-- 2) New settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access settings" ON settings;
CREATE POLICY "Admin full access settings" ON settings
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3) Reservations status in English + extra fields
ALTER TABLE reservations
ALTER COLUMN status SET DEFAULT 'confirmed';

ALTER TABLE reservations
DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE reservations
ADD CONSTRAINT reservations_status_check
CHECK (status IN ('confirmed', 'in_stay', 'completed', 'cancelled'));

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS reservation_number text,
ADD COLUMN IF NOT EXISTS adults integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_per_night numeric(10,2),
ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2) NOT NULL DEFAULT 0;

ALTER TABLE reservations
ALTER COLUMN reservation_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reservations_reservation_number_unique_idx
ON reservations (reservation_number);

ALTER TABLE reservations
DROP COLUMN IF EXISTS guests_count;

-- 4) Inquiries statuses to English
ALTER TABLE inquiries
ALTER COLUMN status SET DEFAULT 'new';

ALTER TABLE inquiries
DROP CONSTRAINT IF EXISTS inquiries_status_check;

ALTER TABLE inquiries
ADD CONSTRAINT inquiries_status_check
CHECK (status IN ('new', 'contacted', 'quoted', 'converted', 'lost'));

-- 5) Occupancies as single source of truth
CREATE TABLE occupancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  occupancy_type text NOT NULL CHECK (occupancy_type IN ('reservation', 'maintenance', 'owner_use', 'inquiry_hold', 'external')),
  reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
  inquiry_id uuid REFERENCES inquiries(id) ON DELETE SET NULL,
  expires_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT occupancies_date_range_check CHECK (start_date < end_date)
);

CREATE INDEX occupancies_unit_dates_idx ON occupancies (unit_id, start_date, end_date);
CREATE INDEX occupancies_type_idx ON occupancies (occupancy_type);
CREATE INDEX occupancies_reservation_idx ON occupancies (reservation_id) WHERE reservation_id IS NOT NULL;

CREATE TRIGGER update_occupancies_updated_at
BEFORE UPDATE ON occupancies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE occupancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access occupancies" ON occupancies
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TABLE IF EXISTS room_blocks;

-- 6) Keep paid_amount in sync when payments are inserted/updated/deleted
CREATE OR REPLACE FUNCTION sync_reservation_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
  target_reservation_id uuid;
BEGIN
  target_reservation_id := COALESCE(NEW.reservation_id, OLD.reservation_id);

  UPDATE reservations
  SET paid_amount = COALESCE((
    SELECT SUM(amount)
    FROM payments
    WHERE reservation_id = target_reservation_id
  ), 0)
  WHERE id = target_reservation_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_sync_reservation_paid_amount_ins ON payments;
DROP TRIGGER IF EXISTS payments_sync_reservation_paid_amount_upd ON payments;
DROP TRIGGER IF EXISTS payments_sync_reservation_paid_amount_del ON payments;

CREATE TRIGGER payments_sync_reservation_paid_amount_ins
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION sync_reservation_paid_amount();

CREATE TRIGGER payments_sync_reservation_paid_amount_upd
AFTER UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION sync_reservation_paid_amount();

CREATE TRIGGER payments_sync_reservation_paid_amount_del
AFTER DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION sync_reservation_paid_amount();

-- 7) Seed data relative to now()
WITH created_venue AS (
  INSERT INTO venues (name, description, address)
  VALUES ('Marmanu House', 'Propiedad principal', 'Ubicacion principal')
  RETURNING id
),
created_units AS (
  INSERT INTO units (venue_id, name, description, is_active)
  SELECT id, 'Habitación 1', 'Habitación principal', true FROM created_venue
  UNION ALL
  SELECT id, 'Habitación 2', 'Segunda habitación', true FROM created_venue
  RETURNING id, name
),
created_guests AS (
  INSERT INTO guests (name, phone)
  VALUES
    ('Carlos Méndez', '3001234567'),
    ('Laura Gómez', '3109876543'),
    ('Pedro Ruiz', '3205551234')
  RETURNING id, name
),
created_inquiries AS (
  INSERT INTO inquiries (guest_name, guest_phone, check_in, check_out, guests_count, source, status, notes)
  VALUES
    (
      'Ana Torres',
      '3000001111',
      (date_trunc('month', now()) + interval '1 month' + interval '10 day')::date,
      (date_trunc('month', now()) + interval '1 month' + interval '14 day')::date,
      2,
      'whatsapp',
      'new',
      'Consulta para Habitación 1 el próximo mes.'
    ),
    (
      'Carlos Méndez',
      '3001234567',
      date_trunc('month', now())::date,
      (date_trunc('month', now()) + interval '5 day')::date,
      2,
      'instagram',
      'converted',
      'Consulta convertida a reserva.'
    )
  RETURNING id, guest_name, status
),
created_reservations AS (
  INSERT INTO reservations (
    reservation_number,
    venue_id,
    guest_id,
    guest_name,
    guest_phone,
    adults,
    children,
    check_in,
    check_out,
    price_per_night,
    total_amount,
    paid_amount,
    status,
    source,
    notes
  )
  SELECT
    to_char(now(), '"RES-"YYYYMM') || '-0001',
    v.id,
    g.id,
    'Carlos Méndez',
    '3001234567',
    2,
    0,
    date_trunc('month', now())::date,
    (date_trunc('month', now()) + interval '5 day')::date,
    150000,
    150000 * 5,
    300000,
    'confirmed',
    'directo',
    'Reserva de ejemplo confirmada'
  FROM created_venue v
  JOIN created_guests g ON g.name = 'Carlos Méndez'
  UNION ALL
  SELECT
    to_char(now(), '"RES-"YYYYMM') || '-0002',
    v.id,
    g.id,
    'Laura Gómez',
    '3109876543',
    2,
    1,
    (current_date - interval '3 day')::date,
    (current_date + interval '2 day')::date,
    120000,
    120000 * ((current_date + interval '2 day')::date - (current_date - interval '3 day')::date),
    120000 * ((current_date + interval '2 day')::date - (current_date - interval '3 day')::date),
    'in_stay',
    'directo',
    'Reserva de ejemplo en estadía'
  FROM created_venue v
  JOIN created_guests g ON g.name = 'Laura Gómez'
  UNION ALL
  SELECT
    to_char(now(), '"RES-"YYYYMM') || '-0003',
    v.id,
    g.id,
    'Pedro Ruiz',
    '3205551234',
    1,
    0,
    (date_trunc('month', now()) - interval '1 month')::date,
    (date_trunc('month', now()) - interval '1 month' + interval '4 day')::date,
    150000,
    150000 * 4,
    150000 * 4,
    'completed',
    'agencia',
    'Reserva de ejemplo finalizada'
  FROM created_venue v
  JOIN created_guests g ON g.name = 'Pedro Ruiz'
  RETURNING id, reservation_number, check_in, check_out
),
created_reservation_units AS (
  INSERT INTO reservation_units (reservation_id, unit_id)
  SELECT r.id, u.id
  FROM created_reservations r
  JOIN created_units u
    ON (r.reservation_number LIKE '%-0001' AND u.name = 'Habitación 1')
    OR (r.reservation_number LIKE '%-0002' AND u.name = 'Habitación 2')
    OR (r.reservation_number LIKE '%-0003' AND u.name = 'Habitación 1')
  RETURNING reservation_id, unit_id
)
INSERT INTO occupancies (unit_id, start_date, end_date, occupancy_type, reservation_id, notes)
SELECT
  ru.unit_id,
  r.check_in,
  r.check_out,
  'reservation',
  r.id,
  'Sincronizado desde reserva seed'
FROM created_reservation_units ru
JOIN created_reservations r ON r.id = ru.reservation_id;

INSERT INTO occupancies (unit_id, start_date, end_date, occupancy_type, notes)
SELECT
  u.id,
  (current_date + interval '14 day')::date,
  (current_date + interval '17 day')::date,
  'maintenance',
  'Pintura y mantenimiento general'
FROM units u
WHERE u.name = 'Habitación 1'
LIMIT 1;

INSERT INTO settings (property_name)
VALUES ('Marmanu House');

INSERT INTO payments (reservation_id, amount, method, payment_date, notes)
SELECT id, 150000, 'transferencia', current_date - interval '1 day', 'Pago parcial 1'
FROM reservations
WHERE reservation_number LIKE '%-0001';

INSERT INTO payments (reservation_id, amount, method, payment_date, notes)
SELECT id, 150000, 'nequi', current_date, 'Pago parcial 2'
FROM reservations
WHERE reservation_number LIKE '%-0001';

INSERT INTO payments (reservation_id, amount, method, payment_date, notes)
SELECT id, total_amount, 'transferencia', current_date - interval '2 day', 'Pago total'
FROM reservations
WHERE reservation_number LIKE '%-0002';

INSERT INTO payments (reservation_id, amount, method, payment_date, notes)
SELECT id, total_amount, 'efectivo', current_date - interval '20 day', 'Pago total histórico'
FROM reservations
WHERE reservation_number LIKE '%-0003';

-- refresh paid_amount from real payments after seed
UPDATE reservations r
SET paid_amount = COALESCE((
  SELECT SUM(p.amount) FROM payments p WHERE p.reservation_id = r.id
), 0);
