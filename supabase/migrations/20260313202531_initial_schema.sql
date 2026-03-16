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

CREATE TABLE reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id uuid REFERENCES venues(id) NOT NULL,
    guest_id uuid REFERENCES guests(id) NOT NULL,
    guests_count integer NOT NULL DEFAULT 1,
    check_in date NOT NULL,
    check_out date NOT NULL,
    total_amount numeric(10,2),
    status text NOT NULL DEFAULT 'consulta' CHECK (status IN ('consulta', 'pendiente_de_pago', 'confirmada', 'en_estadia', 'finalizada', 'cancelada')),
    source text CHECK (source IN ('whatsapp', 'instagram', 'telefono', 'agencia', 'directo')),
    payment_deadline date,
    notes text,
    cancelled_at timestamptz,
    cancellation_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE reservation_units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE NOT NULL,
    unit_id uuid REFERENCES units(id) ON DELETE RESTRICT NOT NULL,
    created_at timestamptz DEFAULT now()
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
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. SEGURIDAD A NIVEL DE FILAS (RLS)
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access venues" ON venues FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access units" ON units FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access guests" ON guests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access pricing_seasons" ON pricing_seasons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access reservations" ON reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access reservation_units" ON reservation_units FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access reservation_status_logs" ON reservation_status_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access payments" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. DATOS INICIALES
INSERT INTO venues (name, description) VALUES ('Marmanu House Principal', 'Sede principal de Marmanu House');
INSERT INTO units (venue_id, name, description)
VALUES (
    (SELECT id FROM venues WHERE name = 'Marmanu House Principal'),
    'Casa completa',
    'Unidad principal de Marmanu House'
);
