import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from '@/lib/firebase/config';
import { updateUser } from '@/lib/supabase/users';
import { User } from '@/types';

/**
 * Sets up a listener for foreground push notifications (when the app is open)
 */
export function setupForegroundMessageListener() {
    if (typeof window === 'undefined' || !('Notification' in window) || !app) return () => { };

    try {
        const messaging = getMessaging(app);

        // Listen for messages when the app is in the foreground
        const unsubscribe = onMessage(messaging, (payload) => {
            if (Notification.permission === 'granted') {
                const title = payload.notification?.title || 'New Notification';
                const options = {
                    body: payload.notification?.body,
                    icon: '/favicon.ico',
                    data: payload.data,
                };

                // Use the service worker to show the notification
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then((registration) => {
                        registration.showNotification(title, options);
                    });
                }
            }
        });

        return unsubscribe;
    } catch (error) {
        console.error('Error setting up foreground message listener:', error);
        return () => { };
    }
}


/**
 * Register the current device for push notifications
 */
export async function registerPushNotifications(userId: string, currentPushTokens: string[] = []) {
    if (typeof window === 'undefined') return;

    try {
        // Only proceed if browser supports notifications
        if (!('Notification' in window)) return;

        // Request permission if not already granted
        if (Notification.permission !== 'granted') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
        }

        if (!app) return;

        const messaging = getMessaging(app);

        // Explicitly register the service worker first
        let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');

        if (!registration) {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        } else {
            registration.update().catch(console.error);
        }

        registration = await navigator.serviceWorker.ready;

        // Use the VAPID key from environment variables
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

        const token = await getToken(messaging, {
            vapidKey: vapidKey,
            serviceWorkerRegistration: registration
        });

        if (token) {
            // Check if token is already in the list
            if (!currentPushTokens.includes(token)) {
                const updatedTokens = [...currentPushTokens, token];
                // Keep only the last 5 tokens (devices)
                const trimmedTokens = updatedTokens.slice(-5);

                await updateUser(userId, {
                    pushTokens: trimmedTokens
                } as Partial<User>);
            }
        }
    } catch (error) {
        console.error('Error during push notification registration:', error);
    }
}

/**
 * Register a token from the native Android app
 */
export async function registerNativePushToken(userId: string, token: string, currentPushTokens: string[] = []) {
    if (!token || !userId) return;

    try {
        if (!currentPushTokens.includes(token)) {
            console.log('[NativePush] Registering new native token:', token);
            const updatedTokens = [...currentPushTokens, token];
            // Keep only the last 5 tokens
            const trimmedTokens = updatedTokens.slice(-5);

            await updateUser(userId, {
                pushTokens: trimmedTokens
            } as Partial<User>);
        }
    } catch (error) {
        console.error('Error registering native push token:', error);
    }
}

/**
 * Sets up a listener for tokens coming from the native Android bridge
 */
export function setupNativePushListener(userId: string, currentPushTokens: string[] = []) {
    if (typeof window === 'undefined') return () => {};

    const handleNativeToken = (event: any) => {
        const token = event.detail?.token;
        if (token) {
            registerNativePushToken(userId, token, currentPushTokens);
        }
    };

    window.addEventListener('native-fcm-token', handleNativeToken);

    // Also check for already set global token
    const existingToken = (window as any).__nativeFcmToken;
    if (existingToken) {
        registerNativePushToken(userId, existingToken, currentPushTokens);
    }

    // Register a global function for the native bridge to call directly
    (window as any).registerFcmToken = (token: string) => {
        registerNativePushToken(userId, token, currentPushTokens);
    };

    return () => {
        window.removeEventListener('native-fcm-token', handleNativeToken);
        delete (window as any).registerFcmToken;
    };
}
