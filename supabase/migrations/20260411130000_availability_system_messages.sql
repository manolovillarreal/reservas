-- ============================================================
-- Availability system messages
-- 1) Extend predefined_messages.key check with availability keys
-- 2) Insert system messages for existing accounts (idempotent)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'predefined_messages_key_check'
      AND conrelid = 'predefined_messages'::regclass
  ) THEN
    ALTER TABLE predefined_messages
      DROP CONSTRAINT IF EXISTS predefined_messages_key_check;
  END IF;

  ALTER TABLE predefined_messages
    ADD CONSTRAINT predefined_messages_key_check
      CHECK (
        key IN (
          'quotation',
          'voucher',
          'preregistro',
          'disponibilidad_negativa',
          'disponibilidad_positiva'
        )
      );
END $$;

INSERT INTO predefined_messages (account_id, name, body, type, key, sort_order, is_deletable)
SELECT
  a.id,
  'Sin disponibilidad',
  $$Hola! 👋

Gracias por tu interés en {{nombre_alojamiento}}.

Lamentablemente no tenemos disponibilidad para
las fechas que nos indicas:

🗓 Check-in: {{fecha_checkin_larga}}
🗓 Check-out: {{fecha_checkout_larga}}
🌙 {{noches}} noches · {{personas}} personas

Te invitamos a consultarnos otras fechas, con
gusto te ayudamos a encontrar la mejor opción. 😊

{{nombre_alojamiento}} · {{telefono}}$$,
  'system',
  'disponibilidad_negativa',
  3,
  false
FROM accounts a
WHERE NOT EXISTS (
  SELECT 1
  FROM predefined_messages pm
  WHERE pm.account_id = a.id
    AND pm.key = 'disponibilidad_negativa'
);

INSERT INTO predefined_messages (account_id, name, body, type, key, sort_order, is_deletable)
SELECT
  a.id,
  'Con disponibilidad',
  $$Hola! 👋

Tenemos disponibilidad para las fechas que
nos indicas. 🎉

🗓 Check-in: {{fecha_checkin_larga}}
🗓 Check-out: {{fecha_checkout_larga}}
🌙 {{noches}} noches · {{personas}} personas

{{#unidades}}
🚪 {{nombre_unidad}}
{{/unidades}}

{{#precio_noche}}
💰 Precio por noche: {{precio_noche}}
{{/precio_noche}}

{{#nombre_huesped}}
Para reservar a nombre de {{nombre_huesped}},
escríbenos y con gusto te ayudamos. 😊
{{/nombre_huesped}}
{{^nombre_huesped}}
Para reservar, escríbenos y con gusto
te ayudamos. 😊
{{/nombre_huesped}}

{{nombre_alojamiento}} · {{telefono}}$$,
  'system',
  'disponibilidad_positiva',
  4,
  false
FROM accounts a
WHERE NOT EXISTS (
  SELECT 1
  FROM predefined_messages pm
  WHERE pm.account_id = a.id
    AND pm.key = 'disponibilidad_positiva'
);
