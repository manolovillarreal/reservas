-- Add is_alert column to distinguish persistent operational alerts
-- (is_alert = true, marked is_read=true when resolved, never deleted)
-- from ephemeral event notifications (is_alert = false, deleted when read).
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS is_alert boolean NOT NULL DEFAULT false;