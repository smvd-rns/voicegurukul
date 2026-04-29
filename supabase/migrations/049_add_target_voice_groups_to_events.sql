ALTER TABLE events ADD COLUMN target_voice_groups JSONB DEFAULT '[]'::jsonb;
