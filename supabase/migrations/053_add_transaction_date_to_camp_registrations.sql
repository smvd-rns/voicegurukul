-- Add transaction_date to camp_registrations for ITT and offline bank transfers
ALTER TABLE camp_registrations ADD COLUMN IF NOT EXISTS transaction_date TEXT;
