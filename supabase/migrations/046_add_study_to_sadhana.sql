-- Migration: Update study column to be numeric (hours)
-- This column records the number of hours spent on education study.

ALTER TABLE sadhana_reports
  DROP COLUMN IF EXISTS study;

ALTER TABLE sadhana_reports
  ADD COLUMN study NUMERIC DEFAULT 0;

COMMENT ON COLUMN sadhana_reports.study IS 'Hours spent on education study daily';
