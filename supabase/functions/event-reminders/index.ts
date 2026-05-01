// supabase/functions/event-reminders/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { importPKCS8, SignJWT } from 'https://esm.sh/jose@4';

const SADHANA_URL       = Deno.env.get('SADHANA_URL')!;
const SADHANA_SERVICE   = Deno.env.get('SADHANA_SERVICE_KEY')!;
const MAIN_URL          = Deno.env.get('MAIN_URL')!;
const MAIN_SERVICE      = Deno.env.get('MAIN_SERVICE_KEY')!;

const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID')!;
const FIREBASE_EMAIL    = Deno.env.get('FIREBASE_CLIENT_EMAIL')!;
const FIREBASE_KEY      = Deno.env.get('FIREBASE_PRIVATE_KEY')!.replace(/\\n/g, '\n');

// Standard HTTP handler
Deno.serve(async (req) => {
    console.log('[event-reminders] Trigger received at:', new Date().toISOString());
    try {
        await processReminders();
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        console.error('[event-reminders] Fatal Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});

async function processReminders() {
    const sadhana = createClient(SADHANA_URL, SADHANA_SERVICE);
    const main    = createClient(MAIN_URL, MAIN_SERVICE);
    const now     = new Date();

    console.log(`[event-reminders] Scanning for reminders due before: ${now.toISOString()}`);

    const { data: events, error: eventsError } = await sadhana
        .from('events')
        .select('*')
        .eq('auto_reminder_enabled', true)
        .not('reminder_date_time', 'is', null)
        .lte('reminder_date_time', now.toISOString())
        .is('reminder_sent_at', null);

    if (eventsError) throw eventsError;

    if (!events?.length) {
        console.log('[event-reminders] No pending reminders to process.');
        return;
    }

    console.log(`[event-reminders] Found ${events.length} event(s) to process.`);
    const accessToken = await getAccessToken();

    for (const event of events) {
        console.log(`[event-reminders] Sending reminders for: "${event.title}"`);
        
        const { data: responses } = await sadhana.from('event_responses').select('user_id, status').eq('event_id', event.id);
        const respondedMap = new Map((responses || []).map((r: any) => [r.user_id, r.status]));
        const reminderTarget = event.reminder_target || ['no_reply'];

        const { data: users, error: userError } = await main.from('users').select('id, push_tokens').eq('verification_status', 'approved');
        if (userError) throw userError;

        const excludedIds = new Set(event.excluded_user_ids || []);
        const tokens = (users || []).filter(u => {
            if (excludedIds.has(u.id)) return false;
            const status = respondedMap.get(u.id);
            if (reminderTarget.includes('no_reply') && !status) return true;
            if (reminderTarget.includes('seen') && status === 'seen') return true;
            return false;
        }).flatMap(u => u.push_tokens || []).filter(Boolean);

        if (tokens.length > 0) {
            const requests = tokens.map(token => 
                sendV1Notification(accessToken, token, {
                    title: `⏰ Reminder: ${event.title}`,
                    body: `This is a reminder for the upcoming event. Please confirm your attendance.`,
                    data: { eventId: event.id, url: '/dashboard/events' }
                })
            );
            await Promise.all(requests);
            console.log(`[event-reminders] Sent ${tokens.length} push notifications.`);
        }

        await sadhana.from('events').update({ reminder_sent_at: now.toISOString() }).eq('id', event.id);
    }
}

async function getAccessToken() {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: FIREBASE_EMAIL,
        sub: FIREBASE_EMAIL,
        aud: 'https://oauth2.googleapis.com/token',
        iat, exp,
        scope: 'https://www.googleapis.com/auth/firebase.messaging'
    };
    const privateKey = await importPKCS8(FIREBASE_KEY, 'RS256');
    const jwt = await new SignJWT(payload).setProtectedHeader(header).sign(privateKey);

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
    });
    const data = await res.json();
    return data.access_token;
}

async function sendV1Notification(accessToken: string, token: string, payload: any) {
    const body = {
        message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
            android: {
                priority: 'high',
                notification: {
                    channel_id: 'voice_gurukul_official_alerts',
                    sound: 'default',
                    notification_priority: 'PRIORITY_HIGH'
                }
            },
            webpush: {
                notification: { icon: '/favicon.ico', click_action: payload.data?.url || '/dashboard/events' }
            }
        }
    };
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return res.json();
}
