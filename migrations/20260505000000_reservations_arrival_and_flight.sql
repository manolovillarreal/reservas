-- Add estimated_arrival_time and flight_number columns to reservations table
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS estimated_arrival_time TIME,
  ADD COLUMN IF NOT EXISTS flight_number VARCHAR(20);
