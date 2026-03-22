-- Migration: normalize reservation status values to English
-- The frontend has always used English values (confirmed, in_stay, completed, cancelled).
-- Earlier migrations left the DB with Spanish values. This migration aligns the DB with the frontend.
-- Date: 2026-03-20

-- 1) Drop old constraint FIRST so backfill UPDATEs are not blocked
ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_status_check;

-- 2) Backfill Spanish → English for reservations
UPDATE reservations SET status = 'confirmed'  WHERE status IN ('confirmada', 'pendiente_de_pago');
UPDATE reservations SET status = 'in_stay'    WHERE status = 'en_estadia';
UPDATE reservations SET status = 'completed'  WHERE status = 'finalizada';
UPDATE reservations SET status = 'cancelled'  WHERE status = 'cancelada';

-- 3) Add new English constraint
ALTER TABLE reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('confirmed', 'in_stay', 'completed', 'cancelled'));

-- 4) Fix default
ALTER TABLE reservations
  ALTER COLUMN status SET DEFAULT 'confirmed';

-- 4) Backfill reservation_status_logs if it stored Spanish values
UPDATE reservation_status_logs SET previous_status = 'confirmed'  WHERE previous_status = 'confirmada';
UPDATE reservation_status_logs SET previous_status = 'confirmed'  WHERE previous_status = 'pendiente_de_pago';
UPDATE reservation_status_logs SET previous_status = 'in_stay'    WHERE previous_status = 'en_estadia';
UPDATE reservation_status_logs SET previous_status = 'completed'  WHERE previous_status = 'finalizada';
UPDATE reservation_status_logs SET previous_status = 'cancelled'  WHERE previous_status = 'cancelada';
UPDATE reservation_status_logs SET new_status = 'confirmed'  WHERE new_status = 'confirmada';
UPDATE reservation_status_logs SET new_status = 'confirmed'  WHERE new_status = 'pendiente_de_pago';
UPDATE reservation_status_logs SET new_status = 'in_stay'    WHERE new_status = 'en_estadia';
UPDATE reservation_status_logs SET new_status = 'completed'  WHERE new_status = 'finalizada';
UPDATE reservation_status_logs SET new_status = 'cancelled'  WHERE new_status = 'cancelada';
