-- Migration: Add table for camp kitchen extra/guest meal counts and prasadam audit
CREATE TABLE IF NOT EXISTS camp_kitchen_extra_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  meal_date VARCHAR(50) NOT NULL,
  meal_name VARCHAR(50) NOT NULL,
  extra_count INT NOT NULL DEFAULT 0,
  extra_served_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  added_by_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(camp_id, meal_date, meal_name)
);

CREATE INDEX IF NOT EXISTS idx_camp_kitchen_extra_meals_camp ON camp_kitchen_extra_meals(camp_id);

-- Optional column for existing databases:
ALTER TABLE camp_kitchen_extra_meals ADD COLUMN IF NOT EXISTS extra_served_count INT NOT NULL DEFAULT 0;
