-- Migration: Add profile fields to account_users; add status to accounts
-- Date: 2026-04-24

-- account_users: new profile columns (is_owner and status already exist
-- from 20260416000000_user_management, ADD COLUMN IF NOT EXISTS is safe)
ALTER TABLE IF EXISTS public.account_users
  ADD COLUMN IF NOT EXISTS full_name     text NULL,
  ADD COLUMN IF NOT EXISTS phone_country text NULL DEFAULT '+57',
  ADD COLUMN IF NOT EXISTS phone_number  text NULL,
  ADD COLUMN IF NOT EXISTS is_owner      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'active';

-- Guard: add the status check constraint only if it is not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_users_status_check'
      AND conrelid = 'public.account_users'::regclass
  ) THEN
    ALTER TABLE public.account_users
      ADD CONSTRAINT account_users_status_check
      CHECK (status IN ('active', 'pending'));
  END IF;
END $$;

-- accounts: add status column for pending/active lifecycle
ALTER TABLE IF EXISTS public.accounts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounts_status_check'
      AND conrelid = 'public.accounts'::regclass
  ) THEN
    ALTER TABLE public.accounts
      ADD CONSTRAINT accounts_status_check
      CHECK (status IN ('active', 'pending'));
  END IF;
END $$;
