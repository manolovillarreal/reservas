-- Remove legacy commission_name column from inquiries and reservations.
-- The canonical source fields are source_detail_id (FK) + source_name (free-text for is_other).
ALTER TABLE inquiries DROP COLUMN IF EXISTS commission_name;
ALTER TABLE reservations DROP COLUMN IF EXISTS commission_name;
