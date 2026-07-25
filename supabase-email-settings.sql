CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial templates with full premium designs
INSERT INTO email_templates (key, name, subject, body, is_enabled) VALUES
('registration_notification', 'Manager Registration Alert', 'New User Registration Pending Approval', '<p style="margin-top: 0; font-size: 16px; color: #334155;">Hare Krishna <strong>{managerName}</strong>,</p>
<p style="font-size: 16px; color: #334155; margin-bottom: 25px;">A new devotee has registered for the VOICE Gurukul and is currently awaiting your review and approval.</p>

<div style="background-color: #fffaf8; border: 1px solid #ffedd5; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
    <h3 style="color: #ea580c; margin-top: 0; margin-bottom: 15px; font-size: 18px; font-weight: 700; border-bottom: 2px solid #ffedd5; padding-bottom: 8px;">Registration Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; width: 35%;">Name</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">{userName}</td>
        </tr>
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; width: 35%;">Email</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">{userEmail}</td>
        </tr>
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; width: 35%;">Phone</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">{userPhone}</td>
        </tr>
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; width: 35%;">Counselor</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">{counselorName}</td>
        </tr>
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; width: 35%;">Role / Ashram</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">{ashramName}</td>
        </tr>
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; width: 35%;">Temple</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">{templeName}</td>
        </tr>
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; width: 35%;">Center</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">{centerName}</td>
        </tr>
    </table>
</div>

<div style="text-align: center; margin: 35px 0;">
    <a href="{approveLink}" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2), 0 2px 4px -1px rgba(22, 163, 74, 0.1);">Approve Devotee Now</a>
</div>

<p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 0;">If you wish to reject or request profile corrections, please log in to the admin dashboard.</p>', true),

('profile_update_approval', 'Profile Update Approved', 'Spiritual Info Update Approved', '<p style="margin-top: 0; font-size: 16px; color: #334155;">Hare Krishna <strong>{userName}</strong>,</p>
<p style="font-size: 16px; color: #334155; line-height: 1.6;">Your requested spiritual profile update has been reviewed and <strong>approved</strong> by the authority.</p>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 25px 0;">
    <h4 style="color: #475569; margin-top: 0; margin-bottom: 12px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">Approved Changes:</h4>
    <ul style="margin: 0; padding-left: 20px; color: #0f172a; font-size: 14px;">
        {fieldsList}
    </ul>
</div>

<p style="font-size: 15px; color: #334155; margin-bottom: 30px;">The updated details are now live on your profile.</p>

<div style="text-align: center; margin: 30px 0;">
    <a href="{dashboardUrl}" style="background: linear-gradient(135deg, #ea580c 0%, #d97706 100%); color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2);">View Profile</a>
</div>', false),

('welcome_approved', 'User Account Welcome', 'Welcome to VOICE Gurukul - Account Approved', '<p style="margin-top: 0; font-size: 16px; color: #334155;">Hare Krishna <strong>{userName}</strong>,</p>
<p style="font-size: 16px; color: #334155;">We are delighted to inform you that your registration for the <strong>VOICE Gurukul</strong> has been successfully reviewed and <strong>approved</strong>!</p>
<p style="font-size: 16px; color: #334155; margin-bottom: 30px;">You can now log in to the dashboard to begin tracking your sadhana, accessing study material, and staying updated with your local center events.</p>' , true)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    is_enabled = EXCLUDED.is_enabled;
