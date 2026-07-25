import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server-db';
import { getAdminClient } from '@/lib/supabase/admin';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { nextGateway, userId } = await request.json();

    // 1. Verify User Role 8
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.role?.includes(8)) {
      console.error('Unauthorized change request:', { userId, role: user?.role });
      return NextResponse.json({ error: 'Unauthorized: Role 8 required' }, { status: 403 });
    }

    // 2. Generate Approval Token
    const approvalToken = crypto.randomBytes(32).toString('hex');

    // 3. Save Pending Change
    const admin = getAdminClient();
    const { error: updateError } = await admin
      .from('platform_settings')
      .update({ 
        pending_value: nextGateway,
        approval_token: approvalToken,
        updated_by: userId
      })
      .eq('id', 'active_payment_gateway');

    if (updateError) {
      console.error('Update platform_settings error:', updateError);
      throw updateError;
    }

    const smtpPass = (process.env.SMTP_PASS || '').replace(/^"|"$/g, '');
    const smtpUser = (process.env.SMTP_USER || '').replace(/^"|"$/g, '');
    const smtpHost = (process.env.SMTP_HOST || '').replace(/^"|"$/g, '');

    // 4. Send Email to smvd@voicepune.com
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // --- DYNAMIC ORIGIN FOR LOCAL TESTING ---
    const origin = new URL(request.url).origin;
    const approvalLink = `${origin}/api/donations/approve-gateway?token=${approvalToken}`;

    console.log('--- GATEWAY CHANGE REQUESTED ---');
    console.log('Origin:', origin);
    console.log('Target Gateway:', nextGateway);
    console.log('Token:', approvalToken);

    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to: 'smvd@voicepune.com',
      subject: '⚠️ SECURITY ACTION: Payment Gateway Change Request',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ea580c; border-radius: 10px;">
          <h2 style="color: #ea580c;">Payment Gateway Change Requested</h2>
          <p>Admin <strong>${user.name}</strong> has requested to switch the platform payment gateway to <strong>${nextGateway.toUpperCase()}</strong>.</p>
          <p>Since this involves financial transactions, your explicit approval is required.</p>
          <div style="margin: 30px 0;">
            <a href="${approvalLink}" 
               style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
               APPROVE CHANGE
            </a>
          </div>
          <p><strong>Link:</strong> <a href="${approvalLink}">${approvalLink}</a></p>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">If you did not request this change, please ignore this email or contact support immediately.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: 'Approval email sent to smvd@voicepune.com' });

  } catch (error: any) {
    console.error('Request change error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
