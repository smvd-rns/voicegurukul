import { supabase as rateLimitClient } from '@/lib/supabase/config';

interface RateLimitResult {
    blocked: boolean;
    message?: string;
    retryAfter?: Date;
}

interface RateLimitConfig {
    action: string;
    limit: number;
    windowMs: number; // Window size in milliseconds
    blockDurationMs: number; // How long to block if limit exceeded
}

export async function checkRateLimit(
    request: Request,
    userId: string | null,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    // 1. Identify User
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    const userAgent = request.headers.get('user-agent') || 'unknown-ua';
    const deviceId = request.headers.get('x-device-id');

    // We will check keys: IP-based, User-based (if logged in), and Device-based
    const checks = [];

    // IP Check
    const ipKey = `ip:${ip}:${config.action}`;
    checks.push(checkSingleLimit(ipKey, config, { ip, userAgent }));

    // Device Check (Primary VPN protection)
    if (deviceId) {
        const deviceKey = `device:${deviceId}:${config.action}`;
        checks.push(checkSingleLimit(deviceKey, config, { deviceId, ip, userAgent }));
    }

    // User Check
    if (userId) {
        const userKey = `user:${userId}:${config.action}`;
        checks.push(checkSingleLimit(userKey, config, { userId, ip, userAgent }));
    }

    // Execute checks in parallel
    const results = await Promise.all(checks);

    // If ANY check returns blocked/error, we deny.
    const blockedResult = results.find(r => r.blocked);
    if (blockedResult) {
        return blockedResult;
    }

    return { blocked: false };
}

async function checkSingleLimit(
    key: string,
    config: RateLimitConfig,
    metadata: any
): Promise<RateLimitResult> {
    const now = new Date();

    // 1. Fetch current limit record
    const { data: record, error } = await rateLimitClient
        .from('rate_limits')
        .select('*')
        .eq('key', key)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Rate limit fetch error:', error);
        // Fail open (allow request) if DB error, or Fail closed? 
        // Usually fail open to avoid downtime, but log it.
        return { blocked: false };
    }

    // 2. If no record, create one
    if (!record) {
        const { error: insertError } = await rateLimitClient
            .from('rate_limits')
            .insert({
                key,
                count: 1,
                window_start: now.toISOString(),
                metadata
            });

        if (insertError) {
            // Handle potential race condition (unique constraint)
            if (insertError.code === '23505') {
                // Retry recursively once if race condition
                return checkSingleLimit(key, config, metadata);
            }
            console.error('Rate limit insert error:', insertError);
        }
        return { blocked: false };
    }

    // 3. Check if currently blocked
    if (record.blocked_until) {
        const blockedUntil = new Date(record.blocked_until);
        if (now < blockedUntil) {
            const minutesLeft = Math.ceil((blockedUntil.getTime() - now.getTime()) / 60000);
            return {
                blocked: true,
                message: `Too many requests. Please try again in ${minutesLeft} minutes.`,
                retryAfter: blockedUntil
            };
        } else {
            // Block expired, reset
            await rateLimitClient
                .from('rate_limits')
                .update({
                    blocked_until: null,
                    count: 1,
                    window_start: now.toISOString(),
                    metadata // update metadata like latest IP
                })
                .eq('key', key);
            return { blocked: false };
        }
    }

    // 4. Check window
    const windowStart = new Date(record.window_start);
    const windowEnd = new Date(windowStart.getTime() + config.windowMs);

    if (now > windowEnd) {
        // New window
        await rateLimitClient
            .from('rate_limits')
            .update({
                count: 1,
                window_start: now.toISOString(),
                metadata
            })
            .eq('key', key);
        return { blocked: false };
    }

    // 5. Increment Count
    const newCount = record.count + 1;

    if (newCount > config.limit) {
        // Block!
        const blockDurationMs = config.blockDurationMs;
        const blockedUntil = new Date(now.getTime() + blockDurationMs);

        await rateLimitClient
            .from('rate_limits')
            .update({
                count: newCount,
                blocked_until: blockedUntil.toISOString(),
                metadata
            })
            .eq('key', key);

        const minutes = Math.ceil(blockDurationMs / 60000);
        return {
            blocked: true,
            message: `Limit exceeded. You are blocked for ${minutes} minutes.`,
            retryAfter: blockedUntil
        };
    } else {
        // Just increment
        await rateLimitClient
            .from('rate_limits')
            .update({ count: newCount, metadata })
            .eq('key', key);

        return { blocked: false };
    }
}
