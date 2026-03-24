-- 1. Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Función genérica para automatizar el updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

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
$$ language 'plpgsql';

-- 3. CREACIÓN DE TABLAS
CREATE TABLE venues (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    address text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id uuid REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    capacity integer NOT NULL DEFAULT 2,
    price_base numeric(10,2),
    price_min numeric(10,2),
    price_extra_person numeric(10,2),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE guests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    phone text,
    email text,
    document text,
    nationality text,
    document_type text CHECK (document_type IN ('passport', 'cedula', 'dni', 'foreign_id')),
    document_number text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE pricing_seasons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id uuid REFERENCES units(id) ON DELETE CASCADE,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    price_per_night numeric(10,2) NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_name text,
    voucher_conditions text,
    price_general_base numeric(10,2),
    price_general_min numeric(10,2),
    price_general_extra numeric(10,2),
    price_per_person_base numeric(10,2),
    price_weekend_pct numeric(5,2),
    price_peak_pct numeric(5,2),
    price_child_pct numeric(5,2) DEFAULT 50,
    price_full_house_min numeric(10,2),
    price_full_house_base numeric(10,2),
    price_full_house_peak numeric(10,2),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE inquiries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_name text,
    guest_phone text,
    check_in date,
    check_out date,
    guests_count integer,
    source text,
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'converted', 'lost')),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_number text UNIQUE NOT NULL,
    venue_id uuid REFERENCES venues(id) NOT NULL,
    guest_id uuid REFERENCES guests(id),
    guest_name text,
    guest_phone text,
    adults integer NOT NULL DEFAULT 1,
    children integer NOT NULL DEFAULT 0,
    check_in date NOT NULL,
    check_out date NOT NULL,
    price_per_night numeric(10,2),
    total_amount numeric(10,2),
    paid_amount numeric(10,2) NOT NULL DEFAULT 0,
    commission_name text,
    commission_percentage numeric(5,2),
    status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'in_stay', 'completed', 'cancelled')),
    source text CHECK (source IN ('whatsapp', 'instagram', 'telefono', 'agencia', 'directo')),
    payment_deadline date,
    preregistro_completado boolean NOT NULL DEFAULT false,
    preregistro_completado_at timestamptz,
    preregistro_token text UNIQUE,
    preregistro_token_expiry timestamptz,
    checkin_at timestamptz,
    notes text,
    cancelled_at timestamptz,
    cancellation_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT reservations_guest_reference_check CHECK (
        guest_id IS NOT NULL OR (guest_name IS NOT NULL AND btrim(guest_name) <> '')
    )
);

CREATE TABLE reservation_units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE NOT NULL,
    unit_id uuid REFERENCES units(id) ON DELETE RESTRICT NOT NULL,
    created_at timestamptz DEFAULT now()
);

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

CREATE TABLE reservation_guests (
    reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE NOT NULL,
    guest_id uuid REFERENCES guests(id) ON DELETE RESTRICT NOT NULL,
    is_primary boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (reservation_id, guest_id)
);

CREATE TABLE reservation_status_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
    previous_status text,
    new_status text NOT NULL,
    changed_at timestamptz DEFAULT now(),
    notes text
);

CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE NOT NULL,
    amount numeric(10,2) NOT NULL,
    method text NOT NULL CHECK (method IN ('transferencia', 'efectivo', 'nequi', 'tarjeta', 'plataforma')),
    reference text,
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. TRIGGERS
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_seasons_updated_at BEFORE UPDATE ON pricing_seasons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_occupancies_updated_at BEFORE UPDATE ON occupancies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER payments_sync_reservation_paid_amount_ins AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION sync_reservation_paid_amount();
CREATE TRIGGER payments_sync_reservation_paid_amount_upd AFTER UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION sync_reservation_paid_amount();
CREATE TRIGGER payments_sync_reservation_paid_amount_del AFTER DELETE ON payments FOR EACH ROW EXECUTE FUNCTION sync_reservation_paid_amount();

-- 5. SEGURIDAD A NIVEL DE FILAS (RLS)
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access venues" ON venues FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access units" ON units FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access guests" ON guests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access pricing_seasons" ON pricing_seasons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access settings" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access inquiries" ON inquiries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access reservations" ON reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access reservation_units" ON reservation_units FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access occupancies" ON occupancies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access reservation_guests" ON reservation_guests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access reservation_status_logs" ON reservation_status_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access payments" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX inquiries_status_created_at_idx
ON inquiries (status, created_at DESC);

CREATE INDEX inquiries_check_in_idx
ON inquiries (check_in);

CREATE INDEX occupancies_unit_dates_idx
ON occupancies (unit_id, start_date, end_date);

CREATE INDEX occupancies_type_idx
ON occupancies (occupancy_type);

CREATE INDEX occupancies_reservation_idx
ON occupancies (reservation_id)
WHERE reservation_id IS NOT NULL;

CREATE UNIQUE INDEX guests_document_identity_unique_idx
ON guests (document_type, document_number)
WHERE document_number IS NOT NULL;

CREATE UNIQUE INDEX reservation_guests_one_primary_idx
ON reservation_guests (reservation_id)
WHERE is_primary;

-- 6. DATOS INICIALES
INSERT INTO settings (property_name) VALUES ('Marmanu House');
INSERT INTO venues (name, description) VALUES ('Marmanu House', 'Sede principal de Marmanu House');
INSERT INTO units (venue_id, name, description)
VALUES (
    (SELECT id FROM venues WHERE name = 'Marmanu House'),
    'Habitación 1',
    'Unidad principal de Marmanu House'
);
