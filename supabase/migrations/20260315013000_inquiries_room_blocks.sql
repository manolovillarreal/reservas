-- Migration: separate inquiries from reservations and add room blocks
-- Date: 2026-03-15 01:30

UPDATE reservations
SET status = 'pendiente_de_pago'
WHERE status = 'consulta';

ALTER TABLE reservations
ALTER COLUMN status SET DEFAULT 'pendiente_de_pago';

ALTER TABLE reservations
DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE reservations
ADD CONSTRAINT reservations_status_check
CHECK (status IN ('pendiente_de_pago', 'confirmada', 'en_estadia', 'finalizada', 'cancelada'));

CREATE TABLE inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name text,
  guest_phone text,
  check_in date,
  check_out date,
  guests_count integer,
  source text,
  status text NOT NULL DEFAULT 'nueva' CHECK (status IN ('nueva', 'contactada', 'cotizada', 'convertida', 'perdida')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE room_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT room_blocks_date_range_check CHECK (start_date < end_date)
);

CREATE INDEX inquiries_status_created_at_idx
ON inquiries (status, created_at DESC);

CREATE INDEX inquiries_check_in_idx
ON inquiries (check_in);

CREATE INDEX room_blocks_unit_dates_idx
ON room_blocks (unit_id, start_date, end_date);

CREATE TRIGGER update_inquiries_updated_at
BEFORE UPDATE ON inquiries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_blocks_updated_at
BEFORE UPDATE ON room_blocks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access inquiries" ON inquiries
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access room_blocks" ON room_blocks
FOR ALL TO authenticated USING (true) WITH CHECK (true);
