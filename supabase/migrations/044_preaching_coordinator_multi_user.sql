-- Migration: Add multi-user columns for Preaching Coordinator role
-- These new array columns allow multiple users per role.
-- Old single-value columns (preaching_coordinator_id, preaching_coordinator_name) are kept for backwards compatibility.

ALTER TABLE centers
  ADD COLUMN IF NOT EXISTS preaching_coordinator_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preaching_coordinator_names TEXT[] DEFAULT '{}';
