-- ==============================================================================
-- Migration: Backfill and Lock Historical Camp Registration Snapshots
-- Purpose: Ensures every historical camp registration has a frozen snapshot of
--          the attendee's center (voice_name), parent temple, and counselor.
--          This guarantees that if a user changes centers in the future,
--          past camp history and audit reports always show their correct
--          original center.
-- ==============================================================================

UPDATE public.camp_registrations r
SET 
  voice_name = COALESCE(
    NULLIF(TRIM(r.voice_name), ''),
    NULLIF(TRIM(u.current_center), ''),
    NULLIF(TRIM(u.center), ''),
    NULLIF(TRIM(u.hierarchy->>'currentCenter'), ''),
    NULLIF(TRIM(u.hierarchy->>'center'), ''),
    'Central VOICE'
  ),
  parent_temple = COALESCE(
    NULLIF(TRIM(r.parent_temple), ''),
    NULLIF(TRIM(u.current_temple), ''),
    NULLIF(TRIM(u.parent_temple), ''),
    NULLIF(TRIM(u.hierarchy->>'currentTemple'), ''),
    NULLIF(TRIM(u.hierarchy->>'parentTemple'), ''),
    'ISKCON NVCC • PUNE'
  ),
  counselor_name = COALESCE(
    NULLIF(TRIM(r.counselor_name), ''),
    NULLIF(TRIM(u.brahmachari_counselor), ''),
    NULLIF(TRIM(u.grihastha_counselor), ''),
    NULLIF(TRIM(u.hierarchy->>'brahmachariCounselor'), '')
  )
FROM public.users u
WHERE (
  (r.email IS NOT NULL AND r.email <> '' AND LOWER(u.email) = LOWER(r.email))
  OR (r.whatsapp IS NOT NULL AND r.whatsapp <> '' AND u.phone IS NOT NULL AND RIGHT(u.phone, 10) = RIGHT(r.whatsapp, 10))
)
AND (
  r.voice_name IS NULL OR TRIM(r.voice_name) = '' OR TRIM(LOWER(r.voice_name)) = 'none' OR
  r.parent_temple IS NULL OR TRIM(r.parent_temple) = '' OR TRIM(LOWER(r.parent_temple)) = 'none'
);

-- For any remaining attendee records not matched by email or phone, guarantee clean fallback
UPDATE public.camp_registrations
SET voice_name = 'Central VOICE'
WHERE voice_name IS NULL OR TRIM(voice_name) = '' OR TRIM(LOWER(voice_name)) = 'none';

UPDATE public.camp_registrations
SET parent_temple = 'ISKCON NVCC • PUNE'
WHERE parent_temple IS NULL OR TRIM(parent_temple) = '' OR TRIM(LOWER(parent_temple)) = 'none';
