-- Soft delete for reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Post-checkin person tracking on reservation_guests
ALTER TABLE reservation_guests ADD COLUMN IF NOT EXISTS arrival_date date;
ALTER TABLE reservation_guests ADD COLUMN IF NOT EXISTS departure_date date;
ALTER TABLE reservation_guests ADD COLUMN IF NOT EXISTS category text DEFAULT 'adult';
ALTER TABLE reservation_guests ADD COLUMN IF NOT EXISTS added_post_checkin boolean DEFAULT false;
