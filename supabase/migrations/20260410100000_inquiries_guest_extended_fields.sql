-- Migration: add guest_nationality, guest_gender, guest_birth_date,
-- guest_document_type and guest_document_number to inquiries.
-- These mirror the same fields on the guests table so that inquiry
-- records carry the guest profile snapshot at the time of creation.

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS guest_nationality    text,
  ADD COLUMN IF NOT EXISTS guest_gender         text
    CHECK (guest_gender IN ('male', 'female', 'unspecified') OR guest_gender IS NULL),
  ADD COLUMN IF NOT EXISTS guest_birth_date     date,
  ADD COLUMN IF NOT EXISTS guest_document_type  text
    CHECK (guest_document_type IN ('passport', 'cedula', 'dni', 'foreign_id') OR guest_document_type IS NULL),
  ADD COLUMN IF NOT EXISTS guest_document_number text;
