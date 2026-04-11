-- Migration: drop legacy 'document' column from guests.
-- Replaced by document_type + document_number (added in 20260314213000).
-- All code references updated to use document_number exclusively.

ALTER TABLE guests DROP COLUMN IF EXISTS document;
