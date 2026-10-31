-- 043_add_poster_and_criteria_to_camps.sql
-- Add poster_url, criteria_message, and banner_message columns to camps table for rich promotional cards and eligibility display

ALTER TABLE camps ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS criteria_message TEXT;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS banner_message TEXT;

COMMENT ON COLUMN camps.poster_url IS 'URL of the camp promotional poster or banner image';
COMMENT ON COLUMN camps.criteria_message IS 'Basic eligibility criteria and requirements for participants';
COMMENT ON COLUMN camps.banner_message IS 'Promotional message or welcome announcement for the camp presentation view';
