'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, X, Check, AlertCircle, Loader2, Key, Mail, Phone, ShieldCheck } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: any;
}

export default function ChangePasswordModal({ isOpen, onClose, userData }: ChangePasswordModalProps) {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [isGoogleSession, setIsGoogleSession] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resetEmailSending, setResetEmailSending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPasswordMessage(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    const fetchStatus = async () => {
      setCheckingPassword(true);
      try {
        const res = await fetch('/api/auth/update-password');
        const data = await res.json();
        if (data.success) {
          setHasPassword(Boolean(data.hasPassword));
          setIsGoogleSession(Boolean(data.isGoogleSession));
        }
      } catch (err) {
        console.error('Failed to check password status', err);
      } finally {
        setCheckingPassword(false);
      }
    };

    fetchStatus();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendResetEmail = async () => {
    const targetEmail = userData?.email;
    if (!targetEmail) {
      setPasswordMessage({ type: 'error', text: 'No email address found for this account' });
      return;
    }

    setResetEmailSending(true);
    setPasswordMessage(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset link');
      setPasswordMessage({
        type: 'success',
        text: `Password reset link sent to ${targetEmail}! Please check your email inbox to set a new password without entering the old one.`,
      });
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Failed to send reset link' });
    } finally {
      setResetEmailSending(false);
    }
  };

  const handleVerifyGoogleToReset = async () => {
    try {
      const returnUrl = encodeURIComponent('/dashboard/profile');
      window.location.href = `/api/auth/google?redirect=${returnUrl}`;
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Google sign-in initiation failed' });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirm password do not match' });
      return;
    }

    const requiresCurrentPassword = hasPassword && !isGoogleSession;
    if (requiresCurrentPassword && !currentPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'Please enter your current password, or verify with Google / use Forgot Password',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: newPassword,
          currentPassword: requiresCurrentPassword ? currentPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setPasswordMessage({ type: 'success', text: data.message || 'Password saved successfully!' });
      setHasPassword(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };

  const requiresCurrentPassword = hasPassword && !isGoogleSession;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Matches Profile section exactly */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
              <Key className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-serif">Account Security & Login Credentials</h3>
              <p className="text-xs sm:text-sm text-amber-100/90 font-medium">
                {hasPassword 
                  ? 'Change your login password or manage direct username sign-in' 
                  : 'Set a password to sign in with your Email / Phone without Google'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 border border-white/20 text-white">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-200" />
              {isGoogleSession ? 'Google Verified Session' : hasPassword ? 'Password Active' : 'Google Auth Only'}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Account Credentials Summary - Matches Profile section exactly */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-50/60 p-4 rounded-xl border border-amber-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Login Email</div>
                <div className="text-sm font-semibold text-gray-800 truncate">{userData?.email || 'N/A'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-orange-800 uppercase tracking-wide">Login Mobile (Username)</div>
                <div className="text-sm font-semibold text-gray-800 truncate">{userData?.phone || 'Not provided'}</div>
              </div>
            </div>
          </div>

          {/* Password update notification banner */}
          {passwordMessage && (
            <div
              className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
                passwordMessage.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {passwordMessage.type === 'success' ? (
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p className="font-medium">{passwordMessage.text}</p>
            </div>
          )}

          {checkingPassword ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              <p className="text-xs font-medium">Checking security credentials...</p>
            </div>
          ) : (
            /* Password Form */
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {isGoogleSession ? (
                <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs sm:text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Google Authenticated Session:</span> Your identity is verified by Google. You can set or change your password directly below without entering your previous password.
                  </div>
                </div>
              ) : hasPassword ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase">
                      Current Password
                    </label>
                    <button
                      type="button"
                      onClick={handleSendResetEmail}
                      disabled={resetEmailSending}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {resetEmailSending ? 'Sending reset link...' : 'Forgot current password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your existing password"
                      className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Reset Options if Devotee Forgot Current Password */}
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs text-amber-950">
                    <span className="text-gray-600">Don&apos;t remember your old password?</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyGoogleToReset}
                        className="inline-flex items-center gap-1.5 font-bold text-amber-800 hover:text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-sm hover:shadow transition-all cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Verify with Google</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSendResetEmail}
                        disabled={resetEmailSending}
                        className="font-bold text-amber-800 hover:text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                      >
                        {resetEmailSending ? 'Sending Link...' : 'Email Reset Link'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                    {hasPassword ? 'New Password' : 'Set New Password'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-900">
                💡 Once saved, you can log in directly using your <strong>Email</strong> or <strong>Mobile Number</strong> with this password.
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  <span>{hasPassword ? 'Change Password' : 'Set Password'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
