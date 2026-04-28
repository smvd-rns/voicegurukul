-- Migration: Add multi-user columns for Grihstha Counselor, Easy Incharge, and Prerna Incharge roles
-- These new array columns allow multiple users per role.
-- Single-value columns are also added for backwards compatibility.

ALTER TABLE centers
  ADD COLUMN IF NOT EXISTS grihstha_counselor_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS grihstha_counselor_name TEXT,
  ADD COLUMN IF NOT EXISTS grihstha_counselor_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS grihstha_counselor_names TEXT[] DEFAULT '{}',
  
  ADD COLUMN IF NOT EXISTS easy_incharge_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS easy_incharge_name TEXT,
  ADD COLUMN IF NOT EXISTS easy_incharge_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS easy_incharge_names TEXT[] DEFAULT '{}',
  
  ADD COLUMN IF NOT EXISTS prerna_incharge_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS prerna_incharge_name TEXT,
  ADD COLUMN IF NOT EXISTS prerna_incharge_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prerna_incharge_names TEXT[] DEFAULT '{}';

COMMENT ON COLUMN centers.grihstha_counselor_id IS 'Reference to the Grihstha Counselor (Role 31)';
COMMENT ON COLUMN centers.easy_incharge_id IS 'Reference to the Easy Incharge (Role 32)';
COMMENT ON COLUMN centers.prerna_incharge_id IS 'Reference to the Prerna Incharge (Role 33)';
