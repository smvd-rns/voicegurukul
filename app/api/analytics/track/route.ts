import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth-server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// List of known bot patterns
const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /googlebot/i, /bingbot/i, /slurp/i,
  /duckduckbot/i, /baiduspider/i, /yandex/i, /sogou/i, /exabot/i,
  /facebot/i, /facebookexternalhit/i, /ia_archiver/i, /curl/i,
  /wget/i, /python/i, /lighthouse/i, /headless/i, /ptst/i, /postman/i
];

// In-memory cache to prevent hitting PostgreSQL on repeated visits/clicks.
// Takes < 100 KB RAM and eliminates 90% of DB queries on a 1 GB droplet.
const memoryVisitCache = new Map<string, number>();

// Clean in-memory cache every 10 minutes to keep RAM usage minimal
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of memoryVisitCache.entries()) {
      if (now - timestamp > 180000) { // older than 3 minutes
        memoryVisitCache.delete(key);
      }
    }
  }, 600000); // 10 minutes
}

function isBotUserAgent(ua: string): boolean {
  if (!ua) return false;
  return BOT_PATTERNS.some(pattern => pattern.test(ua));
}

function parseDeviceType(ua: string, width?: number): string {
  if (width && width > 0) {
    if (width < 640) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }
  if (!ua) return 'desktop';
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function parseBrowser(ua: string): string {
  if (!ua) return 'Unknown';
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Other';
}

function parseOS(ua: string): string {
  if (!ua) return 'Unknown';
  if (/windows/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    // 1. Get or generate visitor ID
    const cookieVid = req.cookies.get('vg_vid')?.value;
    const bodyVid = typeof body.visitorId === 'string' && body.visitorId.length >= 10 ? body.visitorId : null;
    const visitorId = bodyVid || cookieVid || crypto.randomUUID();

    // 2. Extract path & page details
    const rawPath = typeof body.path === 'string' ? body.path.split('?')[0].slice(0, 250) : '/';
    // Ignore internal static/API hits if any slipped through
    if (rawPath.startsWith('/_next') || rawPath.startsWith('/api') || rawPath.includes('.')) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // 3. Fast in-memory deduplication check (0 DB load)
    const dedupKey = `${visitorId}:${rawPath}`;
    const lastVisitTime = memoryVisitCache.get(dedupKey);
    const now = Date.now();

    if (lastVisitTime && now - lastVisitTime < 180000) { // 3 minutes debounce
      // Already recorded recently; return fast without touching PostgreSQL
      return NextResponse.json({ ok: true, deduped: true });
    }

    // Save to memory cache
    memoryVisitCache.set(dedupKey, now);

    const pageTitle = typeof body.title === 'string' ? body.title.slice(0, 250) : null;
    const rawReferrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 500) : null;
    const utmSource = typeof body.utm_source === 'string' ? body.utm_source.slice(0, 100) : null;
    const utmMedium = typeof body.utm_medium === 'string' ? body.utm_medium.slice(0, 100) : null;
    const utmCampaign = typeof body.utm_campaign === 'string' ? body.utm_campaign.slice(0, 100) : null;

    // 4. User agent & device classification
    const ua = req.headers.get('user-agent') || '';
    const isBot = isBotUserAgent(ua);
    const deviceType = parseDeviceType(ua, Number(body.screenWidth));
    const browser = parseBrowser(ua);
    const os = parseOS(ua);

    // 5. IP hash for privacy
    const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                  req.headers.get('x-real-ip') || 
                  '127.0.0.1';
    const ipHash = crypto.createHash('sha256').update(rawIp + '_vg_salt').digest('hex').slice(0, 32);

    // 6. Auth check: determine if user is logged in from JWT token (zero DB query)
    const sessionToken = req.cookies.get('session_token')?.value;
    let isLoggedIn = false;
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (sessionToken) {
      const decoded = verifyToken(sessionToken);
      if (decoded && decoded.userId) {
        isLoggedIn = true;
        userId = decoded.userId;
        userEmail = decoded.email || null;
      }
    }

    // 7. Single fast INSERT into PostgreSQL
    await query(
      `INSERT INTO site_visits (
        visitor_id, user_id, user_email, is_logged_in,
        page_path, page_title, referrer, utm_source, utm_medium, utm_campaign,
        ip_hash, device_type, browser, os, is_bot, created_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, NOW()
      )`,
      [
        visitorId, userId, userEmail, isLoggedIn,
        rawPath, pageTitle, rawReferrer, utmSource, utmMedium, utmCampaign,
        ipHash, deviceType, browser, os, isBot
      ]
    );

    // 8. Return response and ensure vg_vid cookie is set
    const res = NextResponse.json({ ok: true, visitorId });
    if (!cookieVid || cookieVid !== visitorId) {
      res.cookies.set('vg_vid', visitorId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return res;
  } catch (err: any) {
    // Fail silently on analytics so main site is 100% unaffected
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
