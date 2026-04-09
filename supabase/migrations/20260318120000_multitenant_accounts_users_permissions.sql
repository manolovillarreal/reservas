-- Migration: Multi-tenant foundation (accounts, users, permissions, account isolation)
-- Date: 2026-03-18

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Cleanup test data first (requested)
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
  IF to_regclass('public.occupancies') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.occupancies CASCADE';
  END IF;
  IF to_regclass('public.inquiries') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.inquiries CASCADE';
  END IF;
  IF to_regclass('public.reservations') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.reservations CASCADE';
  END IF;
  IF to_regclass('public.pricing_seasons') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.pricing_seasons CASCADE';
  END IF;
  IF to_regclass('public.units') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.units CASCADE';
  END IF;
  IF to_regclass('public.guests') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.guests CASCADE';
  END IF;
  IF to_regclass('public.settings') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.settings CASCADE';
  END IF;
  IF to_regclass('public.venues') IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE public.venues CASCADE';
  END IF;
END $$;

-- 2) Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF to_regclass('public.accounts') IS NOT NULL AND to_regclass('public.update_updated_at_column') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
    CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

INSERT INTO accounts (name, slug)
VALUES ('Marmanu House', 'marmanu-house')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;

-- 3) Account users
CREATE TABLE IF NOT EXISTS account_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_per_account UNIQUE (account_id, user_id)
);

DO $$
BEGIN
  IF to_regclass('public.account_users') IS NOT NULL AND to_regclass('public.update_updated_at_column') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_account_users_updated_at ON account_users;
    CREATE TRIGGER update_account_users_updated_at
    BEFORE UPDATE ON account_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 4) Role permissions (explicit expanded matrix)
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  resource text NOT NULL,
  action text NOT NULL,
  CONSTRAINT unique_role_permission UNIQUE (role, resource, action)
);

INSERT INTO role_permissions (role, resource, action)
VALUES
  -- admin
  ('admin', 'units', 'create'),
  ('admin', 'units', 'edit'),
  ('admin', 'units', 'delete'),
  ('admin', 'pricing', 'create'),
  ('admin', 'pricing', 'edit'),
  ('admin', 'pricing', 'delete'),
  ('admin', 'users', 'invite'),
  ('admin', 'users', 'edit_role'),
  ('admin', 'users', 'remove'),
  ('admin', 'settings', 'edit'),
  ('admin', 'reports', 'view_financial'),
  ('admin', 'reports', 'view_commissions'),
  ('admin', 'reservations', 'create'),
  ('admin', 'reservations', 'edit'),
  ('admin', 'reservations', 'cancel'),
  ('admin', 'reservations', 'checkin'),
  ('admin', 'reservations', 'view'),
  ('admin', 'payments', 'create'),
  ('admin', 'payments', 'delete'),
  ('admin', 'payments', 'view'),
  ('admin', 'guests', 'create'),
  ('admin', 'guests', 'edit'),
  ('admin', 'guests', 'delete'),
  ('admin', 'guests', 'view'),
  ('admin', 'occupancies', 'create'),
  ('admin', 'occupancies', 'edit'),
  ('admin', 'occupancies', 'delete'),
  ('admin', 'occupancies', 'view'),
  ('admin', 'inquiries', 'create'),
  ('admin', 'inquiries', 'edit'),
  ('admin', 'inquiries', 'convert'),
  ('admin', 'inquiries', 'delete'),
  ('admin', 'inquiries', 'view'),
  ('admin', 'vouchers', 'generate'),
  ('admin', 'calendar', 'view'),
  ('admin', 'documents', 'view'),

  -- manager (already expanded with staff permissions)
  ('manager', 'reservations', 'create'),
  ('manager', 'reservations', 'edit'),
  ('manager', 'reservations', 'cancel'),
  ('manager', 'reservations', 'checkin'),
  ('manager', 'reservations', 'view'),
  ('manager', 'payments', 'create'),
  ('manager', 'payments', 'delete'),
  ('manager', 'payments', 'view'),
  ('manager', 'guests', 'create'),
  ('manager', 'guests', 'edit'),
  ('manager', 'guests', 'delete'),
  ('manager', 'guests', 'view'),
  ('manager', 'occupancies', 'create'),
  ('manager', 'occupancies', 'edit'),
  ('manager', 'occupancies', 'delete'),
  ('manager', 'occupancies', 'view'),
  ('manager', 'inquiries', 'create'),
  ('manager', 'inquiries', 'edit'),
  ('manager', 'inquiries', 'convert'),
  ('manager', 'inquiries', 'delete'),
  ('manager', 'inquiries', 'view'),
  ('manager', 'vouchers', 'generate'),
  ('manager', 'calendar', 'view'),
  ('manager', 'documents', 'view'),

  -- staff
  ('staff', 'reservations', 'view'),
  ('staff', 'reservations', 'checkin'),
  ('staff', 'calendar', 'view'),
  ('staff', 'guests', 'view')
ON CONFLICT (role, resource, action) DO NOTHING;

-- 5) Add account_id to operational tables
ALTER TABLE IF EXISTS units ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE IF EXISTS guests ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE IF EXISTS pricing_seasons ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE IF EXISTS reservations ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE IF EXISTS occupancies ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE IF EXISTS inquiries ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE IF EXISTS reservation_guests ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE IF EXISTS reservation_units ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE IF EXISTS reservation_status_logs ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE IF EXISTS settings ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS units_account_id_idx ON units (account_id);
CREATE INDEX IF NOT EXISTS guests_account_id_idx ON guests (account_id);
CREATE INDEX IF NOT EXISTS pricing_seasons_account_id_idx ON pricing_seasons (account_id);
CREATE INDEX IF NOT EXISTS reservations_account_id_idx ON reservations (account_id);
CREATE INDEX IF NOT EXISTS occupancies_account_id_idx ON occupancies (account_id);
CREATE INDEX IF NOT EXISTS payments_account_id_idx ON payments (account_id);
CREATE INDEX IF NOT EXISTS inquiries_account_id_idx ON inquiries (account_id);
CREATE INDEX IF NOT EXISTS reservation_guests_account_id_idx ON reservation_guests (account_id);
CREATE INDEX IF NOT EXISTS reservation_units_account_id_idx ON reservation_units (account_id);
CREATE INDEX IF NOT EXISTS reservation_status_logs_account_id_idx ON reservation_status_logs (account_id);
CREATE INDEX IF NOT EXISTS settings_account_id_idx ON settings (account_id);

-- 6) Backfill account_id with default account
DO $$
DECLARE
  v_account_id uuid;
BEGIN
  SELECT id INTO v_account_id
  FROM accounts
  WHERE slug = 'marmanu-house'
  LIMIT 1;

  IF v_account_id IS NULL THEN
    INSERT INTO accounts (name, slug)
    VALUES ('Marmanu House', 'marmanu-house')
    RETURNING id INTO v_account_id;
  END IF;

  UPDATE units SET account_id = v_account_id WHERE account_id IS NULL;
  UPDATE guests SET account_id = v_account_id WHERE account_id IS NULL;
  UPDATE pricing_seasons SET account_id = v_account_id WHERE account_id IS NULL;
  UPDATE reservations SET account_id = v_account_id WHERE account_id IS NULL;
  UPDATE inquiries SET account_id = v_account_id WHERE account_id IS NULL;
  UPDATE settings SET account_id = v_account_id WHERE account_id IS NULL;

  UPDATE reservation_units ru
  SET account_id = COALESCE(ru.account_id, r.account_id, v_account_id)
  FROM reservations r
  WHERE ru.reservation_id = r.id
    AND ru.account_id IS NULL;

  UPDATE reservation_guests rg
  SET account_id = COALESCE(rg.account_id, r.account_id, v_account_id)
  FROM reservations r
  WHERE rg.reservation_id = r.id
    AND rg.account_id IS NULL;

  UPDATE reservation_status_logs rsl
  SET account_id = COALESCE(rsl.account_id, r.account_id, v_account_id)
  FROM reservations r
  WHERE rsl.reservation_id = r.id
    AND rsl.account_id IS NULL;

  UPDATE payments p
  SET account_id = COALESCE(p.account_id, r.account_id, v_account_id)
  FROM reservations r
  WHERE p.reservation_id = r.id
    AND p.account_id IS NULL;

  UPDATE occupancies o
  SET account_id = COALESCE(
    o.account_id,
    (SELECT account_id FROM reservations WHERE id = o.reservation_id),
    (SELECT account_id FROM inquiries WHERE id = o.inquiry_id),
    u.account_id,
    v_account_id
  )
  FROM units u
  WHERE o.unit_id = u.id
    AND o.account_id IS NULL;
END $$;

-- 7) Enforce not null account_id
ALTER TABLE IF EXISTS units ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE IF EXISTS guests ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE IF EXISTS pricing_seasons ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE IF EXISTS reservations ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE IF EXISTS occupancies ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE IF EXISTS payments ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE IF EXISTS inquiries ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE IF EXISTS reservation_guests ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE IF EXISTS reservation_units ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE IF EXISTS reservation_status_logs ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE IF EXISTS settings ALTER COLUMN account_id SET NOT NULL;

-- 8) Account context helpers
CREATE OR REPLACE FUNCTION current_account_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id
  FROM account_users
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION current_account_id() TO authenticated;

CREATE OR REPLACE FUNCTION bootstrap_account_membership()
RETURNS TABLE(account_id uuid, role text, account_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_account_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM account_users WHERE user_id = v_user_id) THEN
    RETURN QUERY
      SELECT au.account_id, au.role, a.name
      FROM account_users au
      JOIN accounts a ON a.id = au.account_id
      WHERE au.user_id = v_user_id
      ORDER BY au.created_at ASC
      LIMIT 1;
    RETURN;
  END IF;

  IF (SELECT COUNT(*) FROM account_users) = 0 THEN
    SELECT id INTO v_account_id FROM accounts WHERE slug = 'marmanu-house' LIMIT 1;

    IF v_account_id IS NULL THEN
      INSERT INTO accounts (name, slug)
      VALUES ('Marmanu House', 'marmanu-house')
      RETURNING id INTO v_account_id;
    END IF;

    INSERT INTO account_users (account_id, user_id, role)
    VALUES (v_account_id, v_user_id, 'admin')
    ON CONFLICT (account_id, user_id) DO NOTHING;

    RETURN QUERY
      SELECT au.account_id, au.role, a.name
      FROM account_users au
      JOIN accounts a ON a.id = au.account_id
      WHERE au.user_id = v_user_id
      ORDER BY au.created_at ASC
      LIMIT 1;
    RETURN;
  END IF;

  RAISE EXCEPTION 'USER_NOT_ASSOCIATED';
END;
$$;

GRANT EXECUTE ON FUNCTION bootstrap_account_membership() TO authenticated;

-- 9) RLS account isolation
ALTER TABLE IF EXISTS units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pricing_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS occupancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservation_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservation_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access units" ON units;
DROP POLICY IF EXISTS "Admin full access guests" ON guests;
DROP POLICY IF EXISTS "Admin full access pricing_seasons" ON pricing_seasons;
DROP POLICY IF EXISTS "Admin full access reservations" ON reservations;
DROP POLICY IF EXISTS "Admin full access occupancies" ON occupancies;
DROP POLICY IF EXISTS "Admin full access payments" ON payments;
DROP POLICY IF EXISTS "Admin full access inquiries" ON inquiries;
DROP POLICY IF EXISTS "Admin full access reservation_guests" ON reservation_guests;
DROP POLICY IF EXISTS "Admin full access reservation_units" ON reservation_units;
DROP POLICY IF EXISTS "Admin full access reservation_status_logs" ON reservation_status_logs;
DROP POLICY IF EXISTS "Admin full access settings" ON settings;

DROP POLICY IF EXISTS units_account_isolation ON units;
CREATE POLICY units_account_isolation ON units
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS guests_account_isolation ON guests;
CREATE POLICY guests_account_isolation ON guests
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS pricing_seasons_account_isolation ON pricing_seasons;
CREATE POLICY pricing_seasons_account_isolation ON pricing_seasons
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS reservations_account_isolation ON reservations;
CREATE POLICY reservations_account_isolation ON reservations
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS occupancies_account_isolation ON occupancies;
CREATE POLICY occupancies_account_isolation ON occupancies
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS payments_account_isolation ON payments;
CREATE POLICY payments_account_isolation ON payments
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS inquiries_account_isolation ON inquiries;
CREATE POLICY inquiries_account_isolation ON inquiries
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS reservation_guests_account_isolation ON reservation_guests;
CREATE POLICY reservation_guests_account_isolation ON reservation_guests
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS reservation_units_account_isolation ON reservation_units;
CREATE POLICY reservation_units_account_isolation ON reservation_units
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS reservation_status_logs_account_isolation ON reservation_status_logs;
CREATE POLICY reservation_status_logs_account_isolation ON reservation_status_logs
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS settings_account_isolation ON settings;
CREATE POLICY settings_account_isolation ON settings
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS account_users_own_account ON account_users;
CREATE POLICY account_users_own_account ON account_users
FOR ALL TO authenticated
USING (account_id = current_account_id())
WITH CHECK (account_id = current_account_id());

DROP POLICY IF EXISTS accounts_membership_read ON accounts;
CREATE POLICY accounts_membership_read ON accounts
FOR SELECT TO authenticated
USING (id = current_account_id());

DROP POLICY IF EXISTS role_permissions_read_authenticated ON role_permissions;
CREATE POLICY role_permissions_read_authenticated ON role_permissions
FOR SELECT TO authenticated
USING (true);

-- 10) Test data seed (relative dates)
DO $$
DECLARE
  v_account_id uuid;
  v_venue_id uuid;
  v_unit_1 uuid;
  v_unit_2 uuid;
  v_guest_carlos uuid;
  v_guest_laura uuid;
  v_guest_pedro uuid;
  v_res_1 uuid;
  v_res_2 uuid;
  v_res_3 uuid;
  v_start_month date;
BEGIN
  SELECT id INTO v_account_id FROM accounts WHERE slug = 'marmanu-house' LIMIT 1;
  v_start_month := date_trunc('month', now())::date;

  INSERT INTO venues (name, description, address, is_active)
  VALUES ('Marmanu House Principal', 'Main venue', 'Main address', true)
  ON CONFLICT (name) DO UPDATE SET is_active = true
  RETURNING id INTO v_venue_id;

  INSERT INTO settings (property_name, account_id)
  VALUES ('TekMi Places', v_account_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO units (venue_id, name, description, is_active, account_id)
  VALUES
    (v_venue_id, 'Habitacion 1', 'Unidad principal', true, v_account_id),
    (v_venue_id, 'Habitacion 2', 'Unidad secundaria', true, v_account_id);

  SELECT id INTO v_unit_1 FROM units WHERE name = 'Habitacion 1' ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_unit_2 FROM units WHERE name = 'Habitacion 2' ORDER BY created_at ASC LIMIT 1;

  INSERT INTO guests (name, phone, account_id)
  VALUES
    ('Carlos Mendez', '3001234567', v_account_id),
    ('Laura Gomez', '3109876543', v_account_id),
    ('Pedro Ruiz', '3205551234', v_account_id);

  SELECT id INTO v_guest_carlos FROM guests WHERE name = 'Carlos Mendez' ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_guest_laura FROM guests WHERE name = 'Laura Gomez' ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_guest_pedro FROM guests WHERE name = 'Pedro Ruiz' ORDER BY created_at ASC LIMIT 1;

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
    account_id,
    notes
  ) VALUES
    (
      to_char(now(), '"RES-"YYYYMM') || '-0001',
      v_venue_id,
      v_guest_carlos,
      'Carlos Mendez',
      '3001234567',
      2,
      0,
      v_start_month,
      (v_start_month + interval '5 day')::date,
      150000,
      150000 * 5,
      300000,
      'confirmed',
      'directo',
      v_account_id,
      'Reserva confirmada con pago parcial'
    ),
    (
      to_char(now(), '"RES-"YYYYMM') || '-0002',
      v_venue_id,
      v_guest_laura,
      'Laura Gomez',
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
      v_account_id,
      'Reserva en estadia'
    ),
    (
      to_char(now(), '"RES-"YYYYMM') || '-0003',
      v_venue_id,
      v_guest_pedro,
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
      v_account_id,
      'Reserva finalizada'
    );

  SELECT id INTO v_res_1 FROM reservations WHERE reservation_number LIKE '%-0001' ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_res_2 FROM reservations WHERE reservation_number LIKE '%-0002' ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_res_3 FROM reservations WHERE reservation_number LIKE '%-0003' ORDER BY created_at ASC LIMIT 1;

  INSERT INTO reservation_units (reservation_id, unit_id, account_id)
  VALUES
    (v_res_1, v_unit_1, v_account_id),
    (v_res_2, v_unit_2, v_account_id),
    (v_res_3, v_unit_1, v_account_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO reservation_guests (reservation_id, guest_id, is_primary, account_id)
  VALUES
    (v_res_1, v_guest_carlos, true, v_account_id),
    (v_res_2, v_guest_laura, true, v_account_id),
    (v_res_3, v_guest_pedro, true, v_account_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO reservation_status_logs (reservation_id, previous_status, new_status, notes, account_id)
  VALUES
    (v_res_1, null, 'confirmed', 'Creacion inicial', v_account_id),
    (v_res_2, null, 'in_stay', 'Creacion inicial', v_account_id),
    (v_res_3, null, 'completed', 'Creacion inicial', v_account_id);

  INSERT INTO payments (reservation_id, amount, method, reference, payment_date, notes, account_id)
  VALUES
    (v_res_1, 300000, 'transferencia', 'PARCIAL-001', current_date, 'Pago parcial', v_account_id),
    (v_res_2, (SELECT total_amount FROM reservations WHERE id = v_res_2), 'transferencia', 'FULL-002', current_date, 'Pago total', v_account_id),
    (v_res_3, (SELECT total_amount FROM reservations WHERE id = v_res_3), 'efectivo', 'FULL-003', (current_date - interval '30 day')::date, 'Pago total', v_account_id);

  INSERT INTO occupancies (unit_id, start_date, end_date, occupancy_type, reservation_id, notes, account_id)
  VALUES
    (v_unit_1, v_start_month, (v_start_month + interval '5 day')::date, 'reservation', v_res_1, 'Sincronizado desde reserva', v_account_id),
    (v_unit_2, (current_date - interval '3 day')::date, (current_date + interval '2 day')::date, 'reservation', v_res_2, 'Sincronizado desde reserva', v_account_id),
    (v_unit_1, (date_trunc('month', now()) - interval '1 month')::date, (date_trunc('month', now()) - interval '1 month' + interval '4 day')::date, 'reservation', v_res_3, 'Sincronizado desde reserva', v_account_id),
    (v_unit_1, (current_date + interval '14 day')::date, (current_date + interval '17 day')::date, 'maintenance', null, 'Mantenimiento programado', v_account_id);
END $$;