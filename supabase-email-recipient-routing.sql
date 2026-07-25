-- Add columns for routing
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS recipient_type VARCHAR(50) DEFAULT 'devotee',
ADD COLUMN IF NOT EXISTS recipient_role INTEGER DEFAULT NULL;

-- Update initial templates with correct routing types
UPDATE email_templates SET recipient_type = 'managers' WHERE key = 'registration_notification';
UPDATE email_templates SET recipient_type = 'devotee' WHERE key = 'profile_update_approval';
UPDATE email_templates SET recipient_type = 'devotee' WHERE key = 'welcome_approved';
