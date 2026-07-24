-- Migration: Add Service Team structure columns to the centers table
-- Run this in your Supabase SQL Editor
-- Uses IF NOT EXISTS so it is safe to run multiple times

-- Management hierarchy columns (for center lookup by PM/PA/AM)
ALTER TABLE centers ADD COLUMN IF NOT EXISTS temple_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS project_advisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS acting_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Single-holder service team role columns
ALTER TABLE centers ADD COLUMN IF NOT EXISTS oc_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS oc_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS care_giver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS care_giver_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS youth_preacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS youth_preacher_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS internal_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS internal_manager_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS morning_program_in_charge_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS morning_program_in_charge_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS accountant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS accountant_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS kitchen_head_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS kitchen_head_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS study_in_charge_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS study_in_charge_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS event_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS event_admin_name TEXT;

-- Multi-holder role columns (arrays — stored as TEXT[] for flexibility)
ALTER TABLE centers ADD COLUMN IF NOT EXISTS preaching_coordinator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS preaching_coordinator_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS preaching_coordinator_ids TEXT[] DEFAULT '{}';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS preaching_coordinator_names TEXT[] DEFAULT '{}';

ALTER TABLE centers ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS mentor_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS mentor_ids TEXT[] DEFAULT '{}';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS mentor_names TEXT[] DEFAULT '{}';

ALTER TABLE centers ADD COLUMN IF NOT EXISTS frontliner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS frontliner_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS frontliner_ids TEXT[] DEFAULT '{}';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS frontliner_names TEXT[] DEFAULT '{}';

ALTER TABLE centers ADD COLUMN IF NOT EXISTS grihstha_counselor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS grihstha_counselor_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS grihstha_counselor_ids TEXT[] DEFAULT '{}';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS grihstha_counselor_names TEXT[] DEFAULT '{}';

ALTER TABLE centers ADD COLUMN IF NOT EXISTS easy_incharge_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS easy_incharge_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS easy_incharge_ids TEXT[] DEFAULT '{}';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS easy_incharge_names TEXT[] DEFAULT '{}';

ALTER TABLE centers ADD COLUMN IF NOT EXISTS prerna_incharge_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS prerna_incharge_name TEXT;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS prerna_incharge_ids TEXT[] DEFAULT '{}';
ALTER TABLE centers ADD COLUMN IF NOT EXISTS prerna_incharge_names TEXT[] DEFAULT '{}';

-- Verify all columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'centers' 
ORDER BY ordinal_position;
