-- 051_update_reminder_to_specific_time.sql
-- Update events table to support a specific reminder date and time instead of hours-before

ALTER TABLE events
DROP COLUMN IF EXISTS reminder_hours_before,
DROP COLUMN IF EXISTS reminders_sent;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS reminder_date_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN events.reminder_date_time IS 'The specific date and time when the reminder should be sent';
COMMENT ON COLUMN events.reminder_sent_at IS 'Timestamp when the specific reminder was actually sent';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
