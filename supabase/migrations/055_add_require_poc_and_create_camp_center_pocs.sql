-- 055_add_require_poc_and_create_camp_center_pocs.sql

-- 1. Add require_poc flag and optional default POC details to camps table
ALTER TABLE camps ADD COLUMN IF NOT EXISTS require_poc BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS default_poc_name TEXT;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS default_poc_contact TEXT;

COMMENT ON COLUMN camps.require_poc IS 'Whether POC (Point of Contact) details are required before registering for this camp';
COMMENT ON COLUMN camps.default_poc_name IS 'Optional default POC name configured by camp admin';
COMMENT ON COLUMN camps.default_poc_contact IS 'Optional default POC phone number configured by camp admin';

-- 2. Create camp_center_pocs table to store and share POC details per camp and center
CREATE TABLE IF NOT EXISTS camp_center_pocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  center_name TEXT NOT NULL,
  poc_name TEXT NOT NULL,
  poc_phone TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index per camp and case-insensitive center name so all managers of the same center share the POC
CREATE UNIQUE INDEX IF NOT EXISTS idx_camp_center_pocs_camp_center 
  ON camp_center_pocs (camp_id, LOWER(TRIM(center_name)));

-- Index for fast lookup by camp
CREATE INDEX IF NOT EXISTS idx_camp_center_pocs_camp_id 
  ON camp_center_pocs (camp_id);

COMMENT ON TABLE camp_center_pocs IS 'Stores POC contact details per camp and center, shared across all managers (e.g. Role 10, Role 11)';
