import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import pool from '../db';
import dns from 'dns/promises';

// Force Node to prefer IPv4 DNS resolution (avoids broken IPv6 routing on hosting droplets)
import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');

// Initialize the Nodemailer transporter using environment variables
const smtpPass = (process.env.SMTP_PASS || 'dzrd tuat vemy yrdq').replace(/^"|"$/g, '');
const smtpUser = (process.env.SMTP_USER || 'sri.murali.vadan.rns@iskcon.net').replace(/^"|"$/g, '');
const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').replace(/^"|"$/g, '');

// We create a cached transporter.
let _transporterCache: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
    if (_transporterCache) return _transporterCache;

    const isGmail = smtpHost.includes('gmail') || smtpUser.includes('gmail') || smtpUser.includes('voicepune') || smtpUser.includes('iskcon');

    if (isGmail) {
        _transporterCache = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });
    } else {
        _transporterCache = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 15000,
        });
    }

    return _transporterCache;
}

const SENDER_EMAIL = (process.env.SMTP_FROM_EMAIL || '"VOICE Gurukul" <sri.murali.vadan.rns@iskcon.net>').replace(/^"|"$/g, '');

export interface EmailDispatchOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
}

/**
 * Universal email dispatcher: Sends via direct droplet SMTP using ISKCON credentials.
 */
export async function dispatchEmail(options: EmailDispatchOptions): Promise<boolean> {
    try {
        const t = await getTransporter();
        const info = await t.sendMail({
            from: options.from || SENDER_EMAIL,
            to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });
        console.log(`[Email Dispatcher] Successfully delivered via SMTP to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}:`, info.messageId);
        return true;
    } catch (smtpErr) {
        console.error('[Email Dispatcher] Failed to send email via SMTP:', smtpErr);
        
        // Fallback to Vercel microservice if configured
        const serviceUrl = process.env.VERCEL_EMAIL_SERVICE_URL;
        if (serviceUrl) {
            try {
                const apiKey = process.env.EMAIL_API_KEY || 'voicegurukul_mail_secret_key_108';
                console.log(`[Email Dispatcher] Fallback sending via Vercel service...`);
                const res = await fetch(serviceUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                    body: JSON.stringify({
                        to: options.to,
                        subject: options.subject,
                        html: options.html,
                        text: options.text,
                        from: options.from || SENDER_EMAIL,
                    }),
                });
                if (res.ok) {
                    const data = await res.json();
                    console.log(`[Email Dispatcher] Delivered via Vercel fallback:`, data.messageId || data);
                    return true;
                }
            } catch (vErr) {
                console.error('[Email Dispatcher] Vercel fallback also failed:', vErr);
            }
        }
        return false;
    }
}

// A shared premium email header and footer styling helper to ensure visual consistency
function getEmailWrapper(title: string, bodyContent: string, isAlert = false) {
    const primaryColor = isAlert ? '#dc2626' : '#ea580c';
    const secondaryColor = isAlert ? '#ef4444' : '#f97316';
    
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                
                <!-- Premium Gradient Header -->
                <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 35px 30px; text-align: center;">
                    <div style="font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px;">VOICE Gurukul</div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${title}</h1>
                </div>
                
                <!-- Email Content Area -->
                <div style="padding: 40px 35px;">
                    ${bodyContent}
                </div>
                
                <!-- Premium Footer -->
                <div style="background-color: #f1f5f9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <div style="font-size: 14px; font-weight: 600; color: #ea580c; margin-bottom: 12px; font-style: italic;">
                        Hare Krishna Hare Krishna Krishna Krishna Hare Hare<br/>
                        Hare Rama Hare Rama Rama Rama Hare Hare
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 15px;">
                        &copy; 2026 VOICE Gurukul. All rights reserved.<br/>
                        Spiritual Platform for Sadhana, Education, and Community Connection.
                    </div>
                </div>
                
            </div>
        </div>
    `;
}

async function getEmailTemplate(key: string, aliasKey?: string) {
    try {
        let result = await pool.query('SELECT * FROM email_templates WHERE key = $1 LIMIT 1', [key]);
        if (result.rows && result.rows.length > 0) {
            return result.rows[0];
        }
        if (aliasKey) {
            result = await pool.query('SELECT * FROM email_templates WHERE key = $1 LIMIT 1', [aliasKey]);
            if (result.rows && result.rows.length > 0) {
                return result.rows[0];
            }
        }
    } catch (e) {
        console.error('Failed to query email template from DB:', e);
    }
    return null;
}

/**
 * Sends a notification email to the managers for a new user registration.
 */
export async function sendRegistrationNotification(
    managerEmail: string,
    managerName: string,
    newUser: any,
    approveLink: string
) {
    if (!process.env.SMTP_USER) {
        console.warn(`[Mock Email] Would send Registration Mail to ${managerEmail} for user ${newUser.name}`);
        console.warn(`Approve Link: ${approveLink}`);
        return true;
    }

    const template = await getEmailTemplate('user_registered_admin_notification', 'registration_notification');
    if (template && !template.is_enabled) {
        console.log(`[Email Skipped] Template 'registration_notification' is disabled.`);
        return true;
    }

    const detailRow = (label: string, value: string) => `
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; width: 35%;">${label}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">${value}</td>
        </tr>
    `;

    let subject = 'New User Registration Pending Approval';
    let htmlContent = '';

    if (template) {
        const uPhone = newUser.phone || 'N/A';
        const cName = newUser.hierarchy?.counselor === 'Other' ? (newUser.hierarchy?.otherCounselor || 'Other') : (newUser.hierarchy?.counselor || 'N/A');
        const aName = newUser.hierarchy?.ashram || 'N/A';
        const tName = newUser.hierarchy?.currentTemple === 'Other' ? (newUser.hierarchy?.otherTemple || 'Other') : (newUser.hierarchy?.currentTemple || 'N/A');
        const ctName = newUser.hierarchy?.currentCenter === 'Other' ? (newUser.hierarchy?.otherCenter || 'Other') : (newUser.hierarchy?.currentCenter || 'N/A');

        subject = template.subject
            .replace(/{managerName}/g, managerName)
            .replace(/{userName}/g, newUser.name);
        const templateBody = template.body_html || template.body || '';
        const body = templateBody
            .replace(/{managerName}/g, managerName)
            .replace(/{userName}/g, newUser.name)
            .replace(/{userEmail}/g, newUser.email)
            .replace(/{userPhone}/g, uPhone)
            .replace(/{counselorName}/g, cName)
            .replace(/{ashramName}/g, aName)
            .replace(/{templeName}/g, tName)
            .replace(/{centerName}/g, ctName)
            .replace(/{approveLink}/g, approveLink);
        htmlContent = getEmailWrapper(template.name || 'Registration Pending', body);
    } else {
        const htmlBody = `
            <p style="margin-top: 0; font-size: 16px; color: #334155;">Hare Krishna <strong>${managerName}</strong>,</p>
            <p style="font-size: 16px; color: #334155; margin-bottom: 25px;">A new devotee has registered on the sadhana platform and is pending your approval.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 30px 0;">
                <h4 style="margin: 0 0 15px 0; color: #475569; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Registration Details:</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    ${detailRow('Full Name', newUser.name)}
                    ${detailRow('Email Address', newUser.email)}
                    ${newUser.phone ? detailRow('Phone Number', newUser.phone) : ''}
                    ${newUser.whatsapp ? detailRow('WhatsApp Number', newUser.whatsapp) : ''}
                    ${newUser.current_temple ? detailRow('Temple', newUser.current_temple) : ''}
                </table>
            </div>

            <p style="font-size: 15px; color: #334155; margin-bottom: 30px;">Please click the button below to review, assign roles, and verify the registration details:</p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="${approveLink}" style="background: linear-gradient(135deg, #ea580c 0%, #d97706 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2), 0 2px 4px -1px rgba(234, 88, 12, 0.1);">Approve Registration</a>
            </div>
        `;
        htmlContent = getEmailWrapper('New Registration', htmlBody);
    }

    return await dispatchEmail({
        to: managerEmail,
        subject: subject,
        html: htmlContent,
    });
}

/**
 * Sends a registration receipt / acknowledgement email to the newly registered devotee.
 */
export async function sendDevoteeRegistrationConfirmation(userEmail: string, userName: string) {
    const template = await getEmailTemplate('user_registration_confirmation', 'registration_confirmation');
    let subject = `Welcome to VOICE Gurukul - Registration Received (${userName})`;
    let htmlContent = '';

    if (template && template.is_enabled) {
        subject = template.subject.replace(/{userName}/g, userName);
        const templateBody = template.body_html || template.body || '';
        const body = templateBody
            .replace(/{userName}/g, userName)
            .replace(/{userEmail}/g, userEmail);
        htmlContent = getEmailWrapper(template.name || 'Registration Received', body);
    } else {
        const htmlBody = `
            <p style="margin-top: 0; font-size: 16px; color: #334155;">Hare Krishna <strong>${userName}</strong>,</p>
            <p style="font-size: 16px; color: #334155; line-height: 1.6;">Thank you for registering on <strong>VOICE Gurukul</strong>! Your application details have been successfully submitted and are currently under review by the authority.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Status:</strong> <span style="color: #ea580c; font-weight: 700;">Pending Verification</span></p>
                <p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px;">You will receive an approval email as soon as your account is activated.</p>
            </div>

            <p style="font-size: 14px; color: #64748b;">If you have any questions, feel free to contact your center coordinator.</p>
        `;
        htmlContent = getEmailWrapper('Registration Received', htmlBody);
    }

    return await dispatchEmail({
        to: userEmail,
        subject: subject,
        html: htmlContent,
    });
}

/**
 * Sends a welcome/approval notification to the newly approved user.
 */
export async function sendApprovalNotification(userEmail: string, userName: string, dashboardUrl: string) {
    if (!process.env.SMTP_USER) {
        console.warn(`[Mock Email] Would send Approval Welcome Mail to ${userEmail} for user ${userName}`);
        return true;
    }

    const template = await getEmailTemplate('user_approved_notification', 'welcome_approved');
    if (template && !template.is_enabled) {
        console.log(`[Email Skipped] Template 'welcome_approved' is disabled.`);
        return true;
    }

    let subject = 'Your VOICE Gurukul Account is Approved!';
    let htmlContent = '';

    if (template) {
        subject = template.subject.replace(/{userName}/g, userName);
        const templateBody = template.body_html || template.body || '';
        let body = templateBody
            .replace(/{userName}/g, userName)
            .replace(/{dashboardUrl}/g, dashboardUrl);
        body += `
            <div style="text-align: center; margin: 35px 0;">
                <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #ea580c 0%, #d97706 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2);">Go to Dashboard</a>
            </div>
        `;
        htmlContent = getEmailWrapper(template.name || 'Account Approved!', body);
    } else {
        const htmlBody = `
            <p style="margin-top: 0; font-size: 16px; color: #334155;">Hare Krishna <strong>${userName}</strong>,</p>
            <p style="font-size: 16px; color: #334155; margin-bottom: 25px;">Your registration with VOICE Gurukul has been approved.</p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #ea580c 0%, #d97706 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2), 0 2px 4px -1px rgba(234, 88, 12, 0.1);">Go to Dashboard</a>
            </div>
            
            <p style="font-size: 15px; color: #334155;">Thank you for registering. We look forward to supporting your spiritual journey.</p>
        `;
        htmlContent = getEmailWrapper('Account Approved!', htmlBody);
    }

    return await dispatchEmail({
        to: userEmail,
        subject: subject,
        html: htmlContent,
    });
}

/**
 * Sends a rejection notification to the user.
 */
export async function sendRejectionNotification(userEmail: string, userName: string, rejectionReason: string) {
    if (!process.env.SMTP_USER) {
        console.warn(`[Mock Email] Would send Rejection Mail to ${userEmail} for user ${userName}`);
        console.warn(`Reason: ${rejectionReason}`);
        return true;
    }

    const template = await getEmailTemplate('user_rejected_notification', 'welcome_rejected');
    if (template && !template.is_enabled) {
        console.log(`[Email Skipped] Template 'user_rejected_notification' is disabled.`);
        return true;
    }

    let subject = 'Update Regarding Your VOICE Gurukul Registration';
    let htmlContent = '';

    if (template) {
        subject = template.subject.replace(/{userName}/g, userName);
        const templateBody = template.body_html || template.body || '';
        const body = templateBody
            .replace(/{userName}/g, userName)
            .replace(/{userEmail}/g, userEmail)
            .replace(/{rejectionReason}/g, rejectionReason)
            .replace(/{loginLink}/g, `${process.env.NEXT_PUBLIC_APP_URL || 'https://voicegurukul.com'}/auth/login`);
        htmlContent = getEmailWrapper(template.name || 'Application Update', body, true);
    } else {
        const htmlBody = `
            <p style="margin-top: 0; font-size: 16px; color: #334155;">Hare Krishna <strong>${userName}</strong>,</p>
            <p style="font-size: 16px; color: #334155;">Thank you for your application to VOICE Gurukul. After reviewing your registration details, we are unable to approve your application at this time.</p>
            
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 30px 0;">
                <h4 style="margin: 0 0 8px 0; color: #991b1b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Reason for Rejection:</h4>
                <p style="margin: 0; color: #7f1d1d; font-size: 15px; font-style: italic; line-height: 1.5;">&ldquo;${rejectionReason}&rdquo;</p>
            </div>

            <p style="font-size: 16px; color: #334155; margin-bottom: 30px;">Do not worry! You can log back into your account, update any incorrect details, and resubmit your application for review.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://voicegurukul.com'}/auth/login" style="background-color: #475569; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 15px;">Login and Re-submit</a>
            </div>
        `;
        htmlContent = getEmailWrapper('Application Update', htmlBody, true);
    }

    return await dispatchEmail({
        to: userEmail,
        subject: subject,
        html: htmlContent,
    });
}

/**
 * Sends a password reset email to a user.
 */
export async function sendForgotPasswordEmail(userEmail: string, userName: string, resetLink: string) {
    if (!process.env.SMTP_USER) {
        console.warn(`[Mock Email] Would send Forgot Password Mail to ${userEmail} for user ${userName}`);
        console.warn(`Reset Link: ${resetLink}`);
        return true;
    }

    const template = await getEmailTemplate('password_reset_otp', 'forgot_password');
    if (template && !template.is_enabled) {
        console.log(`[Email Skipped] Template 'password_reset_otp' is disabled.`);
        return true;
    }

    let subject = 'Reset Your VOICE Gurukul Password';
    let htmlContent = '';

    if (template) {
        subject = template.subject.replace(/{userName}/g, userName);
        const templateBody = template.body_html || template.body || '';
        const body = templateBody
            .replace(/{userName}/g, userName)
            .replace(/{userEmail}/g, userEmail)
            .replace(/{resetLink}/g, resetLink);
        htmlContent = getEmailWrapper(template.name || 'Reset Password Request', body);
    } else {
        const htmlBody = `
            <p style="margin-top: 0; font-size: 16px; color: #334155;">Hare Krishna <strong>${userName}</strong>,</p>
            <p style="font-size: 16px; color: #334155; margin-bottom: 25px;">You requested to reset your password for your VOICE Gurukul account. Click the button below to set a new password:</p>
            
            <div style="text-align: center; margin: 35px 0;">
                <a href="${resetLink}" style="background: linear-gradient(135deg, #ea580c 0%, #d97706 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2), 0 2px 4px -1px rgba(234, 88, 12, 0.1);">Reset Password</a>
            </div>
            
            <p style="font-size: 14px; color: #64748b;">This reset link is valid for 1 hour. If you did not request this, you can safely ignore this email; your password will remain unchanged.</p>
        `;
        htmlContent = getEmailWrapper('Reset Password Request', htmlBody);
    }

    return await dispatchEmail({
        to: userEmail,
        subject: subject,
        html: htmlContent,
    });
}

/**
 * Sends a notification to the user when their spiritual profile details update has been approved.
 */
export async function sendProfileUpdateApprovalNotification(userEmail: string, userName: string, dashboardUrl: string, changedFields: string[]) {
    if (!process.env.SMTP_USER) {
        console.warn(`[Mock Email] Would send Profile Update Approval Mail to ${userEmail} for user ${userName}`);
        return true;
    }

    const template = await getEmailTemplate('profile_update_approved', 'profile_update_approval');
    if (template && !template.is_enabled) {
        console.log(`[Email Skipped] Template 'profile_update_approval' is disabled.`);
        return true;
    }

    // Format list of changes nicely
    const formatFieldLabel = (f: string) => f.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    const changesList = changedFields.map(f => `<li style="margin-bottom: 6px; font-weight: 600;">${formatFieldLabel(f)}</li>`).join('');

    let subject = 'Spiritual Profile Update Approved - VOICE Gurukul';
    let htmlContent = '';

    if (template) {
        subject = template.subject.replace(/{userName}/g, userName);
        let body = template.body
            .replace(/{userName}/g, userName)
            .replace(/{dashboardUrl}/g, dashboardUrl)
            .replace(/{fieldsList}/g, changesList);
        htmlContent = getEmailWrapper(template.name || 'Profile Update Approved', body);
    } else {
        const htmlBody = `
            <p style="margin-top: 0; font-size: 16px; color: #334155;">Hare Krishna <strong>${userName}</strong>,</p>
            <p style="font-size: 16px; color: #334155; line-height: 1.6;">Your requested spiritual profile update has been reviewed and <strong>approved</strong> by the authority.</p>
            
            ${changedFields.length > 0 ? `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <h4 style="color: #475569; margin-top: 0; margin-bottom: 12px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">Approved Changes:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #0f172a; font-size: 14px;">
                    ${changesList}
                </ul>
            </div>
            ` : ''}

            <p style="font-size: 15px; color: #334155; margin-bottom: 30px;">The updated details are now live on your profile.</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #ea580c 0%, #d97706 100%); color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2);">View Profile</a>
            </div>
        `;
        htmlContent = getEmailWrapper('Profile Update Approved', htmlBody);
    }

    return await dispatchEmail({
        to: userEmail,
        subject: subject,
        html: htmlContent,
    });
}



