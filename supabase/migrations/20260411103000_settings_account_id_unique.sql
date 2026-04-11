DO $$
BEGIN
  DELETE FROM public.settings target
  USING public.settings duplicate
  WHERE target.account_id = duplicate.account_id
    AND target.id <> duplicate.id
    AND (
      target.updated_at < duplicate.updated_at
      OR (target.updated_at = duplicate.updated_at AND target.created_at < duplicate.created_at)
      OR (target.updated_at = duplicate.updated_at AND target.created_at = duplicate.created_at AND target.id < duplicate.id)
    );

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'settings_account_id_key'
  ) THEN
    ALTER TABLE public.settings
      ADD CONSTRAINT settings_account_id_key UNIQUE (account_id);
  END IF;
END $$;