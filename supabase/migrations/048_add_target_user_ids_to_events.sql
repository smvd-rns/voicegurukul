-- Add target_user_ids to events table and update verification checks
ALTER TABLE IF EXISTS events 
ADD COLUMN IF NOT EXISTS target_user_ids UUID[] DEFAULT NULL;

-- Note: verification_status is in the main database users table, 
-- but we should ensure our logic in the app handles it.
