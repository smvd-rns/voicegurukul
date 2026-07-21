'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';
import { Loader2, Flower } from 'lucide-react';

export default function AuthCallbackPage() {
    const router = useRouter();
    const processedRef = useRef(false);

    useEffect(() => {
        // Prevent double processing in development with Strict Mode
        if (processedRef.current) return;
        processedRef.current = true;

        const handleAuthCallback = async () => {
            if (!supabase) {
                console.error('Supabase client not initialized');
                router.push('/auth/login?error=config_error');
                return;
            }

            try {
                // Exchange the code for a session
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error during auth callback:', (error as any).message);
                    router.push('/auth/login?error=auth_callback_error');
                    return;
                }

                if (session) {
                    // Check if user profile exists and handle redirection based on status
                    // The AuthProvider or ProtectedRoute will handle the actual routing
                    // based on the user's verification status once we land on the dashboard
                    router.push('/dashboard');
                } else {
                    // If no session, try to get the hash from URL if it exists (implicit flow)
                    const hash = window.location.hash;
                    if (hash && hash.includes('access_token')) {
                        // Let supabase client handle the hash automatically
                        // Just wait a moment and check session again
                        setTimeout(async () => {
                            if (!supabase) return;
                            const { data: { session: newSession } } = await supabase.auth.getSession();
                            if (newSession) {
                                router.push('/dashboard');
                            } else {
                                router.push('/auth/login?error=no_session');
                            }
                        }, 500);
                    } else {
                        // No session and no hash code
                        router.push('/auth/login?error=no_code');
                    }
                }
            } catch (err) {
                console.error('Unexpected error during auth callback:', err);
                router.push('/auth/login?error=unexpected_error');
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-600 via-orange-600 to-red-600">
            <div className="absolute inset-0 opacity-10 mix-blend-overlay"></div>

            <div className="relative z-10 p-8 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-sm w-full mx-4 text-center transform transition-all animate-in fade-in zoom-in duration-300">
                <div className="bg-white/20 p-3 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <Flower className="w-8 h-8 text-white animate-spin-slow" />
                </div>

                <h2 className="text-2xl font-serif font-bold text-white mb-2">VOICE Gurukul</h2>

                <div className="flex items-center justify-center gap-3 text-orange-50 font-medium bg-black/10 py-2 px-4 rounded-full w-fit mx-auto mt-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Completing sign in...</span>
                </div>

                <p className="text-orange-100 text-sm mt-6 opacity-80">
                    Setting up your secure session
                </p>
            </div>
        </div>
    );
}
