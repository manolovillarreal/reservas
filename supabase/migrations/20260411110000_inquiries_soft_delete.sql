-- Soft delete support for inquiries table
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
