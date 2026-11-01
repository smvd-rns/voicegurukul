-- 056_add_email_instructions_and_links_to_camps.sql
-- Add email_instructions and email_links columns to camps table for dynamic registration email guidelines and action links (WhatsApp, docs, videos, etc.)

ALTER TABLE camps ADD COLUMN IF NOT EXISTS email_instructions TEXT;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS email_links JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN camps.email_instructions IS 'Custom notice or instructions included in registration emails';
COMMENT ON COLUMN camps.email_links IS 'Array of custom action links (WhatsApp groups, docs, videos, maps) for registration emails';
