-- Create camp_payment_orders table for tracking payment attempts, gateway transactions, and orphaned payments
CREATE TABLE IF NOT EXISTS camp_payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  camp_id UUID REFERENCES camps(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  payer_name TEXT,
  payer_email TEXT,
  payer_contact TEXT,
  entries_payload JSONB DEFAULT '[]'::jsonb,
  form_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'created', -- 'created', 'attempted', 'captured', 'failed', 'registration_completed', 'registration_failed'
  payment_id TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camp_payment_orders_camp_id ON camp_payment_orders(camp_id);
CREATE INDEX IF NOT EXISTS idx_camp_payment_orders_order_id ON camp_payment_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_camp_payment_orders_payment_id ON camp_payment_orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_camp_payment_orders_status ON camp_payment_orders(status);

