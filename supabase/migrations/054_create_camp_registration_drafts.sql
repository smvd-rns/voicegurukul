-- Create camp_registration_drafts table for saving managerial registration progress
CREATE TABLE IF NOT EXISTS camp_registration_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  form_data JSONB DEFAULT '{}'::jsonb,
  payment_method TEXT,
  itt_temple_name TEXT,
  itt_transaction_ref TEXT,
  itt_transaction_date TEXT,
  idt_source TEXT,
  idt_passcode TEXT,
  coupon_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT camp_registration_drafts_user_camp_unique UNIQUE (user_id, camp_id)
);

CREATE INDEX IF NOT EXISTS idx_camp_registration_drafts_user_camp 
  ON camp_registration_drafts(user_id, camp_id);
