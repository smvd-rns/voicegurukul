'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Loader2, Lock, ArrowLeft } from 'lucide-react';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="text-center">
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl shadow-md flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" />
          <p className="flex-1 font-semibold text-sm">
            Invalid or missing password reset link. Please request a new link.
          </p>
        </div>
        <Link href="/auth/forgot-password" className="inline-flex items-center text-sm font-semibold text-amber-700 hover:text-amber-800 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Request New Link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccess('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl shadow-md flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" />
          <p className="flex-1 font-semibold text-sm break-words">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-xl shadow-md flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-600" />
          <p className="flex-1 font-semibold text-sm break-words">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            New Password
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm text-gray-800 bg-white"
              placeholder="••••••••"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm text-gray-800 bg-white"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-3 rounded-xl shadow-md hover:from-amber-700 hover:to-orange-700 transition-all text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span>Updating Password...</span>
            </>
          ) : (
            'Update Password'
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-amber-100 p-8 sm:p-10 mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 rounded-2xl shadow-lg mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent mb-2">
            Reset Password
          </h1>
          <p className="text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>

        <Suspense fallback={
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading form...</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>

        {/* Hare Krishna Mahamantra */}
        <div className="mt-8 pt-6 border-t border-amber-200 text-center">
          <p className="text-xs text-amber-700 mb-3 font-medium uppercase tracking-wide">Hare Krishna Mahamantra</p>
          <div className="space-y-1 font-serif font-bold text-amber-700/90 text-sm">
            <p>Hare Krishna Hare Krishna</p>
            <p>Krishna Krishna Hare Hare</p>
            <p>Hare Rama Hare Rama</p>
            <p>Rama Rama Hare Hare</p>
          </div>
        </div>
      </div>
    </div>
  );
}
