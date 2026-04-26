-- Migration: Plans catalog and account_plans assignment table
-- Date: 2026-04-24

CREATE TABLE IF NOT EXISTS plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  units_min   integer NOT NULL,
  units_max   integer NULL,
  price_cop   integer NOT NULL,
  is_trial    boolean NOT NULL DEFAULT false,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO plans (name, units_min, units_max, price_cop, is_trial) VALUES
  ('Prueba',      0,  NULL, 0,      true),
  ('Básico',      1,  1,    40000,  false),
  ('Estándar',    2,  5,    60000,  false),
  ('Profesional', 6,  10,   80000,  false),
  ('Avanzado',    11, 15,   100000, false),
  ('Premium',     16, 20,   150000, false),
  ('Empresarial', 21, NULL, 250000, false)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS account_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id),
  plan_id     uuid NOT NULL REFERENCES plans(id),
  started_at  timestamptz DEFAULT now(),
  expires_at  timestamptz NULL,
  assigned_by uuid NULL REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS account_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_read_authenticated ON plans;
CREATE POLICY plans_read_authenticated ON plans
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS account_plans_read_own ON account_plans;
CREATE POLICY account_plans_read_own ON account_plans
  FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT au.account_id
      FROM public.account_users au
      WHERE au.user_id = auth.uid()
    )
  );
