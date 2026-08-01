'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, signInWithGoogle } from '@/lib/supabase/auth';
import { useAuth } from '@/components/providers/AuthProvider';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function LoginContent() {
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData, loading } = useAuth();

  useEffect(() => {
    // Only redirect if auth check is complete and user is authenticated
    // Don't redirect while still loading auth state
    if (!loading && user) {
      // AuthProvider finishes loading only after profile fetch (and retries) complete.
      // No row in public.users (e.g. first-time Google sign-in) => userData is null — send to registration.
      if (!userData) {
        router.push('/auth/complete-registration');
        return;
      }

      // Check verification status and redirect accordingly
      if (userData.verificationStatus === 'pending') {
        router.push('/auth/pending');
      } else if (userData.verificationStatus !== 'approved') {
        router.push('/auth/complete-registration');
      } else {
        const next = searchParams.get('next') || '/dashboard';
        router.push(next);
      }
    }
  }, [user, userData, loading, router, searchParams]);

  useEffect(() => {
    // Check for error in URL params (from OAuth callback)
    const urlError = searchParams.get('error');
    const errorDetails = searchParams.get('details');

    if (urlError) {
      if (urlError === 'oauth_error') {
        let errorMessage = 'Failed to sign in with Google. Please try again.';
        if (errorDetails) {
          if (errorDetails.includes('redirect_uri_mismatch')) {
            errorMessage = 'OAuth configuration error: Redirect URI mismatch. Please ensure the redirect URI is configured in Google Cloud Console.';
          } else if (errorDetails.includes('access_denied')) {
            errorMessage = 'Access denied. Please grant the necessary permissions.';
          } else {
            errorMessage = `Failed to sign in with Google: ${errorDetails}`;
          }
        }
        setError(errorMessage);
      } else if (urlError === 'token_exchange_failed') {
        setError(`Google token exchange failed: ${errorDetails || 'Check Client Secret'}`);
      } else if (urlError === 'profile_fetch_failed') {
        setError('Failed to fetch profile from Google.');
      } else if (urlError === 'no_code') {
        setError('No authorization code returned from Google.');
      } else if (urlError === 'configuration') {
        setError('Authentication configuration error. Please contact support.');
      } else {
        setError(`Google login error: ${urlError}`);
      }
      // Clean up URL
      router.replace('/auth/login');
    }
  }, [searchParams, router]);

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const next = searchParams.get('next') || undefined;
      const { data, error } = await signInWithGoogle(next);

      if (error) {
        throw new Error((error as any).message || 'Failed to initiate Google sign-in');
      }

      // If we get a URL, redirect to it (this is the OAuth provider URL)
      if (data?.url) {
        window.location.href = data.url;
        // Don't set loading to false - we're redirecting
        return;
      }

      // If no URL, something went wrong
      throw new Error('No redirect URL received from OAuth provider');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-10 text-center transform transition-all">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
          </div>

          <h2 className="text-3xl font-display font-bold mb-4 text-orange-700 tracking-wide">
            Hare Krishna
          </h2>

          <div className="space-y-2">
            <p className="text-xl text-gray-800 font-serif">
              Loading...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render login form if user is authenticated (will redirect via useEffect)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-10 text-center transform transition-all">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
          </div>

          <h2 className="text-3xl font-display font-bold mb-4 text-orange-700 tracking-wide">
            Hare Krishna
          </h2>

          <div className="space-y-2">
            <p className="text-xl text-gray-800 font-serif">
              Redirecting to {searchParams.get('next') ? 'approval page' : 'dashboard'}...
            </p>
            <p className="text-sm text-orange-600/80 font-medium tracking-widest uppercase animate-pulse">
              Please wait...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 px-2 sm:px-4 md:px-6 py-3 sm:py-6 md:py-8 lg:py-12">
      <div className="max-w-md w-full bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl sm:shadow-2xl border border-amber-100 p-3 sm:p-6 md:p-8 lg:p-10 mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg mb-2 sm:mb-3 md:mb-4 lg:mb-5">
            <LogIn className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 text-white" />
          </div>
          <div className="mb-1.5 sm:mb-2 md:mb-3">
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-serif text-amber-700 font-semibold mb-0.5 sm:mb-1">
              Hare Krishna
            </p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold font-serif bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent mb-1.5 sm:mb-2 md:mb-3 px-1 sm:px-2">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 font-medium px-1 sm:px-2">
            Sign in to your account with Google
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-3 sm:mb-4 md:mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl shadow-md flex items-start space-x-2 sm:space-x-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-red-600" />
            <p className="flex-1 font-semibold text-xs sm:text-sm md:text-base break-words">{error}</p>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          const form = e.currentTarget;
          const email = (form.elements.namedItem('email') as HTMLInputElement).value;
          const password = (form.elements.namedItem('password') as HTMLInputElement).value;
          
          try {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            window.location.href = searchParams.get('next') || '/dashboard';
          } catch (err: any) {
            setError(err.message || 'Invalid email or password');
          }
        }} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                name="email"
                type="email"
                required
                placeholder="name@domain.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm text-gray-800"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase">Password</label>
              <Link href="/auth/forgot-password" className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm text-gray-800"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-3 rounded-xl shadow-md hover:from-amber-700 hover:to-orange-700 transition-all text-sm sm:text-base"
          >
            Sign In with Email
          </button>
        </form>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-xs font-semibold text-gray-400 uppercase">Or</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base md:text-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mb-6"
        >
          {googleLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Create Account Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="font-semibold text-amber-700 hover:text-amber-800 hover:underline">
              Create New Account
            </Link>
          </p>
        </div>

        {/* Hare Krishna Mahamantra */}
        <div className="mt-8 sm:mt-10 md:mt-12 pt-6 sm:pt-8 border-t border-amber-200">
          <div className="text-center px-2">
            <p className="text-xs sm:text-sm text-amber-700 mb-3 sm:mb-4 md:mb-5 font-medium uppercase tracking-wide">Hare Krishna Mahamantra</p>
            <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
              <p className="text-xs sm:text-sm md:text-base lg:text-lg font-serif font-bold leading-relaxed animate-mantra-glow break-words drop-shadow-lg">
                Hare Krishna Hare Krishna
              </p>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg font-serif font-bold leading-relaxed animate-mantra-fade break-words drop-shadow-lg">
                Krishna Krishna Hare Hare
              </p>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg font-serif font-bold leading-relaxed animate-mantra-fade-delay-1 break-words drop-shadow-lg">
                Hare Rama Hare Rama
              </p>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg font-serif font-bold leading-relaxed animate-mantra-fade-delay-1-5 break-words drop-shadow-lg">
                Rama Rama Hare Hare
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-10 text-center">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
          </div>
          <h2 className="text-3xl font-display font-bold mb-4 text-orange-700 tracking-wide">Hare Krishna</h2>
          <div className="space-y-2">
            <p className="text-xl text-gray-800 font-serif">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
