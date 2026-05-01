'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function DeepLinkHandler() {
    const router = useRouter();

    useEffect(() => {
        const handleDeepLink = (event: any) => {
            const url = event.detail?.url;
            if (url) {
                console.log('[DeepLink] Navigating to:', url);
                router.push(url);
            }
        };

        // Listen for events from the Android/Capacitor wrapper
        window.addEventListener('app-deep-link', handleDeepLink);

        // Check for any pending deep links in localStorage (set by the wrapper on startup)
        const pendingLink = localStorage.getItem('pending_deep_link');
        if (pendingLink) {
            console.log('[DeepLink] Found pending link:', pendingLink);
            localStorage.removeItem('pending_deep_link');
            router.push(pendingLink);
        }

        return () => {
            window.removeEventListener('app-deep-link', handleDeepLink);
        };
    }, [router]);

    return null; // This component doesn't render anything
}
