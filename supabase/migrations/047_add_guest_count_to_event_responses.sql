-- Add guest_count to event_responses table
ALTER TABLE IF EXISTS event_responses 
ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 0;
