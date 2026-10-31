-- 042_add_eligible_centers_to_camps.sql
-- Add eligible_centers JSONB column to camps table to allow center-based registration restrictions

ALTER TABLE camps ADD COLUMN IF NOT EXISTS eligible_centers JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN camps.eligible_centers IS 'Array of center names permitted to view and register for this camp. Empty array indicates open to all centers.';

-- Force schema reload
NOTIFY pgrst, 'reload schema';
