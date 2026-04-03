-- 1. Fecha de nacimiento en huéspedes
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS birth_date date;

-- 2. Tokens de acompañantes + raw para idempotencia
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS companion_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS companion_token_raw text,
  ADD COLUMN IF NOT EXISTS preregistro_token_raw text;

-- 3. Ampliar constraint de key en predefined_messages
ALTER TABLE predefined_messages
  DROP CONSTRAINT IF EXISTS predefined_messages_key_check;

ALTER TABLE predefined_messages
  ADD CONSTRAINT predefined_messages_key_check
    CHECK (key IN ('quotation', 'voucher', 'preregistro'));