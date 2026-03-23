-- ============================================================
-- Tabla notifications: notificaciones in-app por cuenta
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   uuid        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    type         text        NOT NULL,
    title        text        NOT NULL,
    message      text,
    related_type text        CHECK (related_type IN ('reservation', 'inquiry', 'guest') OR related_type IS NULL),
    related_id   uuid,
    is_read      boolean     NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_account_isolation"
    ON notifications FOR ALL
    USING  (account_id = current_account_id())
    WITH CHECK (account_id = current_account_id());

CREATE INDEX IF NOT EXISTS idx_notifications_account
    ON notifications (account_id);

CREATE INDEX IF NOT EXISTS idx_notifications_account_is_read
    ON notifications (account_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_account_created
    ON notifications (account_id, created_at DESC);

-- ============================================================
-- Tabla notification_settings: una fila por cuenta
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_settings (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
    settings   jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_settings_account_isolation"
    ON notification_settings FOR ALL
    USING  (account_id = current_account_id())
    WITH CHECK (account_id = current_account_id());
