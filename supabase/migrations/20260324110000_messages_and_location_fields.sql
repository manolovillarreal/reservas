ALTER TABLE IF EXISTS account_profile
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS location_url text;

CREATE TABLE IF NOT EXISTS predefined_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'custom' CHECK (type IN ('system', 'custom')),
  key text CHECK (key IN ('quotation', 'voucher')),
  sort_order integer NOT NULL DEFAULT 0,
  is_deletable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT predefined_messages_type_key_check CHECK (
    (type = 'system' AND key IS NOT NULL)
    OR (type = 'custom' AND key IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_predefined_messages_account
  ON predefined_messages (account_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_predefined_messages_account_key
  ON predefined_messages (account_id, key);

CREATE TABLE IF NOT EXISTS message_settings (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  show_unit_amenities boolean NOT NULL DEFAULT true,
  quotation_greeting text,
  quotation_intro text,
  quotation_closing text,
  quotation_signature text,
  voucher_greeting text,
  voucher_intro text,
  voucher_closing text,
  voucher_signature text,
  checkin_time text,
  checkout_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_message_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_message_settings_updated_at'
  ) THEN
    CREATE TRIGGER trg_message_settings_updated_at
      BEFORE UPDATE ON message_settings
      FOR EACH ROW
      EXECUTE FUNCTION set_message_settings_updated_at();
  END IF;
END;
$$;

ALTER TABLE predefined_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'predefined_messages'
      AND policyname = 'predefined_messages_account_isolation'
  ) THEN
    CREATE POLICY predefined_messages_account_isolation
      ON predefined_messages FOR ALL
      USING (account_id = current_account_id())
      WITH CHECK (account_id = current_account_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_settings'
      AND policyname = 'message_settings_account_isolation'
  ) THEN
    CREATE POLICY message_settings_account_isolation
      ON message_settings FOR ALL
      USING (account_id = current_account_id())
      WITH CHECK (account_id = current_account_id());
  END IF;
END;
$$;
