-- Migration: add quote_token to inquiries
-- Enables public shareable quotation URLs with opaque tokens
-- Date: 2026-03-22

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS quote_token text UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS inquiries_quote_token_unique_idx
  ON inquiries (quote_token)
  WHERE quote_token IS NOT NULL;
