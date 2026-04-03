-- ============================================================
-- Migración: phone_country_code + limpieza de reservations
-- ============================================================

-- 1. Agregar phone_country_code a guests
ALTER TABLE guests ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+57';

-- 2. Agregar phone_country_code a inquiries
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+57';

-- 3. Eliminar el constraint que referencia guest_name antes de borrar la columna
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_guest_reference_check;

-- 4. Eliminar columnas desnormalizadas de reservations
ALTER TABLE reservations DROP COLUMN IF EXISTS guest_name;
ALTER TABLE reservations DROP COLUMN IF EXISTS guest_phone;
ALTER TABLE reservations DROP COLUMN IF EXISTS phone;

-- 5. Nuevo constraint: guest_id es obligatorio
ALTER TABLE reservations
  ADD CONSTRAINT reservations_guest_id_required
  CHECK (guest_id IS NOT NULL);
