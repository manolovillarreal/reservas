-- Track who performed the soft delete on a reservation.
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);
