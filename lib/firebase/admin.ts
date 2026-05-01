// Initialize Firebase Admin for server-side push notifications
export async function getFirebaseAdmin() {
    if (typeof window !== 'undefined') return null;

    // Dynamically import to prevent bundling on the client
    const admin = await import('firebase-admin');

    if (admin.apps.length > 0) {
        return admin.app();
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // CRITICAL FIX: Ensure newlines in private key string are parsed correctly
    // Sometimes .env loads them as literal '\n' strings instead of actual newlines
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
        // Remove quotes if present, then replace literal \n with actual newlines
        privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
    }

    if (!projectId || !clientEmail || !privateKey) {
        console.warn('Firebase Admin credentials not fully configured. Push notifications will be disabled.');
        return null;
    }

    try {
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        return null;
    }
}

/**
 * Send a push notification to a list of tokens
 */
export async function sendPushNotification(tokens: string[], title: string, body: string, data?: any) {
    if (!tokens || tokens.length === 0) return;

    if (typeof window !== 'undefined') return;

    const firebaseAdmin = await getFirebaseAdmin();
    if (!firebaseAdmin) return;

    // We need to import admin again or use the one from getFirebaseAdmin if we want to use its types/namespaces
    // But since we are using firebase-admin's singleton-like access via app(), we can just use the messaging service
    const admin = await import('firebase-admin');

    const message: any = { // Using any to avoid complex type casting with dynamic imports
        tokens,
        notification: {
            title,
            body,
        },
        data: data || {},
        android: {
            priority: 'high',
            notification: {
                channelId: 'voice_gurukul_official_alerts',
                sound: 'default',
                notificationPriority: 'PRIORITY_HIGH',
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    badge: 1,
                },
            },
        },
        webpush: {
            notification: {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
            },
            fcmOptions: {
                link: data?.url || '/dashboard/events',
            },
        },
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} push notifications.`);

        if (response.failureCount > 0) {
            response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success) {
                    console.error('Failure sending push notification to token:', tokens[idx], resp.error);
                }
            });
        }

        return response;
    } catch (error) {
        console.error('Error sending push notifications:', error);
        return null;
    }
}
