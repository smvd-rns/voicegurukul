-- 050_add_auto_reminder_to_events.sql
-- Add auto-reminder configuration to events table

ALTER TABLE events
ADD COLUMN IF NOT EXISTS auto_reminder_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_hours_before INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS reminder_target TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS reminders_sent INTEGER[] DEFAULT '{}'; -- tracks which reminder_hours_before have already been dispatched

COMMENT ON COLUMN events.auto_reminder_enabled IS 'Whether automatic reminders are enabled for this event';
COMMENT ON COLUMN events.reminder_hours_before IS 'Array of hours before event_date to send reminders, e.g. {24, 2}';
COMMENT ON COLUMN events.reminder_target IS 'Who to remind: no_reply, seen, or both';
COMMENT ON COLUMN events.reminders_sent IS 'Which reminder_hours_before values have already been sent (to avoid duplicates)';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
