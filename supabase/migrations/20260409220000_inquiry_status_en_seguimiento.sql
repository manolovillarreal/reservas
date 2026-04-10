-- Rename status 'contactada' to 'en_seguimiento' in inquiries
-- Step 1: Drop existing status constraint
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check;
-- Step 2: Migrate existing rows
UPDATE inquiries SET status = 'en_seguimiento' WHERE status = 'contactada';
-- Step 3: Add updated constraint with new status value
ALTER TABLE inquiries ADD CONSTRAINT inquiries_status_check
  CHECK (status IN ('nueva', 'en_seguimiento', 'cotizada', 'vencida', 'convertida', 'perdida'));
