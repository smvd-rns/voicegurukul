// Import Firebase app and messaging scripts
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Initialize Firebase with the config from URL parameters
// Since we don't have access to process.env here, we need to hardcode it or use URL params.
// It's safe to expose these as they are public client keys.
// Parse config from Service Worker URL search params
const params = new URLSearchParams(self.location.search);
firebase.initializeApp({
    apiKey: params.get('apiKey') || "",
    authDomain: params.get('authDomain') || "",
    projectId: params.get('projectId') || "",
    storageBucket: params.get('storageBucket') || "",
    messagingSenderId: params.get('messagingSenderId') || "",
    appId: params.get('appId') || ""
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'New Message';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: '/favicon.ico',
        data: {
            url: payload.data?.url || payload.fcmOptions?.link || '/dashboard'
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
