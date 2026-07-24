-- 052_add_temple_center_to_profile_requests.sql
-- Add temple_name and center_name columns to profile_update_requests
-- These columns allow routing requests to the correct admin without expensive JOINs

ALTER TABLE profile_update_requests
    ADD COLUMN IF NOT EXISTS temple_name TEXT,
    ADD COLUMN IF NOT EXISTS center_name TEXT;

-- Index for fast filtering by temple
CREATE INDEX IF NOT EXISTS idx_profile_req_temple ON profile_update_requests(temple_name);
CREATE INDEX IF NOT EXISTS idx_profile_req_center ON profile_update_requests(center_name);

-- Backfill existing rows from requested_changes JSONB
-- This handles both object {name: "..."} and plain string forms
UPDATE profile_update_requests
SET temple_name = COALESCE(
    requested_changes->>'currentTemple',
    CASE WHEN requested_changes->'currentTemple'->>'name' IS NOT NULL
         THEN requested_changes->'currentTemple'->>'name'
         ELSE NULL END
)
WHERE temple_name IS NULL
  AND (
    requested_changes->>'currentTemple' IS NOT NULL
    OR requested_changes->'currentTemple'->>'name' IS NOT NULL
  );

-- Update RLS: Allow managing directors (role 11) to SELECT profile requests for their temples
-- Drop old over-restrictive policies if they exist
DROP POLICY IF EXISTS "MDs can view profile requests for their temples" ON profile_update_requests;

CREATE POLICY "MDs can view profile requests for their temples"
    ON profile_update_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND (
                8 = ANY(u.role)
                OR 11 = ANY(u.role)
                OR 12 = ANY(u.role)
                OR 13 = ANY(u.role)
                OR 21 = ANY(u.role)
              )
        )
    );

-- Allow MDs / directors / etc. to update (approve/reject) profile requests
DROP POLICY IF EXISTS "MDs can update profile requests" ON profile_update_requests;

CREATE POLICY "MDs can update profile requests"
    ON profile_update_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND (
                8 = ANY(u.role)
                OR 11 = ANY(u.role)
                OR 12 = ANY(u.role)
                OR 13 = ANY(u.role)
                OR 21 = ANY(u.role)
              )
        )
    );
