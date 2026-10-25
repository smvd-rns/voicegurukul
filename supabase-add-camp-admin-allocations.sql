-- Migration to create the camp_admin_allocations table
-- Allows Super Admins to assign specific staff/volunteers to manage specific camps:
-- 1. 'attendance': View registrations, download attendee list, scan QR passes & mark check-in/meals only
-- 2. 'refunds': View and process devotee refund requests for that camp only
-- 3. 'both': Full camp coordinator with access to both attendance and refunds

CREATE TABLE IF NOT EXISTS public.camp_admin_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN ('attendance', 'refunds', 'both', 'scan_pass')),
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, camp_id)
);

-- Indexes for ultra-fast lookup during admin authentication & camp queries
CREATE INDEX IF NOT EXISTS idx_camp_alloc_user_id ON public.camp_admin_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_camp_alloc_camp_id ON public.camp_admin_allocations(camp_id);

-- Optional Check-in & Meal Punch tracking columns on camp_registrations
ALTER TABLE public.camp_registrations 
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS meals_served JSONB DEFAULT '{}'::jsonb;

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION update_camp_admin_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_camp_admin_allocations_timestamp ON public.camp_admin_allocations;

CREATE TRIGGER trg_camp_admin_allocations_timestamp
BEFORE UPDATE ON public.camp_admin_allocations
FOR EACH ROW
EXECUTE FUNCTION update_camp_admin_allocations_updated_at();
