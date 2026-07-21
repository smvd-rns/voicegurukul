import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';
import { sendApprovalNotification } from '@/lib/utils/email';
import { generateMembershipIdForUser } from '@/lib/utils/membership';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const token = searchParams.get('token');

        if (!userId || !token) {
            return new NextResponse('Missing parameters', { status: 400 });
        }

        const secret = process.env.EMAIL_APPROVAL_SECRET || 'fallback_secret_123';
        const expectedToken = crypto.createHmac('sha256', secret).update(userId).digest('hex');

        if (token !== expectedToken) {
            return new NextResponse('Invalid or expired approval token', { status: 403 });
        }

        const supabase = getAdminClient();
        
        // Check current status
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('verification_status')
            .eq('id', userId)
            .single();

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

        if (fetchError || !user) {
            return new NextResponse('User not found', { status: 404 });
        }

        if (user.verification_status === 'approved') {
            const htmlAlreadyApproved = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>User Already Approved</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
                        .info-icon { color: #f59e0b; font-size: 28px; font-weight: bold; margin-bottom: 20px; letter-spacing: 1px; }
                        .title { font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 10px; }
                        .text { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
                        .btn { background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block; transition: background-color 0.2s; }
                        .btn:hover { background-color: #c2410c; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="info-icon">ℹ️</div>
                        <div class="title">User Already Approved</div>
                        <div class="text">This user's account has already been approved and activated. No further action is required.</div>
                        <a href="${baseUrl}/dashboard" class="btn">Return to Dashboard</a>
                    </div>
                </body>
                </html>
            `;
            return new NextResponse(htmlAlreadyApproved, {
                headers: { 'Content-Type': 'text/html' }
            });
        }

        // Update user
        const { error } = await supabase
            .from('users')
            .update({ 
                verification_status: 'approved',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            return new NextResponse('Failed to approve user', { status: 500 });
        }

        // Trigger the approval notification directly
        const { data: userData } = await supabase
            .from('users')
            .select('email, name')
            .eq('id', userId)
            .single();

        if (userData?.email) {
            await sendApprovalNotification(userData.email, userData.name || 'Devotee', `${baseUrl}/dashboard`);
            
            // Also generate Membership ID if missing
            try {
                await generateMembershipIdForUser(supabase, userId);
            } catch (genErr) {
                console.error('Failed to generate membership ID during email approval:', genErr);
            }
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>User Approved</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
                    .success-icon { color: #ea580c; font-size: 28px; font-weight: bold; margin-bottom: 20px; letter-spacing: 1px; }
                    .title { font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 10px; }
                    .text { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
                    .btn { background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block; transition: background-color 0.2s; }
                    .btn:hover { background-color: #c2410c; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="success-icon">🙏 Hare Krishna 🙏</div>
                    <div class="title">User Approved Successfully!</div>
                    <div class="text">The user's account has been activated. They will receive an email letting them know they can log in.</div>
                    <a href="${baseUrl}/dashboard" class="btn">Return to Dashboard</a>
                </div>
            </body>
            </html>
        `;

        return new NextResponse(html, {
            headers: { 'Content-Type': 'text/html' }
        });
    } catch (error) {
        console.error('API /emails/approve error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}
