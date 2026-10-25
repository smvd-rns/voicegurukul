'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Clock, CheckCircle, Home, LogOut, CheckCircle2, XCircle, AlertCircle, Edit3 } from 'lucide-react';

export default function PendingApprovalPage() {
    const { user, userData, loading, signOut } = useAuth();
    const router = useRouter();
    const [isAlreadyApproved, setIsAlreadyApproved] = useState(false);

    const isRejected = userData?.verificationStatus === 'rejected';

    useEffect(() => {
        // If user is not logged in, redirect to login
        if (!loading && !user) {
            router.push('/auth/login');
            return;
        }

        // Logged in but no public.users row (e.g. incomplete flow) — finish registration instead of a false "pending" UI
        if (!loading && user && !userData) {
            router.push('/auth/complete-registration');
            return;
        }

        // If user is approved, show approved message
        if (!loading && userData?.verificationStatus === 'approved') {
            setIsAlreadyApproved(true);
            return;
        }

        // If user has incomplete registration, redirect to complete registration
        if (!loading && (userData?.verificationStatus === 'incomplete' || userData?.verificationStatus === 'unverified')) {
            router.push('/auth/complete-registration');
            return;
        }
    }, [user, userData, loading, router]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/auth/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
                    {/* Animated Icon */}
                    <div className="mb-6 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-200 rounded-full animate-ping opacity-75"></div>
                            <div className={`relative rounded-full p-6 ${isRejected ? 'bg-gradient-to-br from-red-500 to-rose-500' : 'bg-gradient-to-br from-orange-500 to-amber-500'}`}>
                                {isRejected ? <XCircle className="w-12 h-12 text-white" /> : <Clock className="w-12 h-12 text-white" />}
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">
                        {isAlreadyApproved ? 'Account Approved!' : isRejected ? 'Application Rejected' : 'Approval Pending'}
                    </h1>

                    {/* Message */}
                    <div className="space-y-4 mb-8">
                        {isAlreadyApproved ? (
                            <>
                                <p className="text-gray-600 text-lg">
                                    Hare Krishna, <span className="font-semibold text-orange-600">{userData?.name || user?.email}</span>!
                                </p>
                                <p className="text-gray-600 font-medium">
                                    Your account has been already approved and activated. You now have full access to the platform.
                                </p>
                            </>
                        ) : isRejected ? (
                            <>
                                <div className="space-y-2">
                                    <p className="text-gray-600 text-lg">
                                        Hare Krishna, <span className="font-semibold text-orange-600">{userData?.name || user?.email}</span>
                                    </p>
                                    <p className="text-red-600 font-semibold bg-red-50 py-2 px-4 rounded-lg inline-block border border-red-100">
                                        Your application was not approved.
                                    </p>
                                </div>
                                {userData?.rejectionReason && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 text-left">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Reason for Rejection:</p>
                                        <p className="text-gray-700 italic font-medium">&ldquo;{userData.rejectionReason}&rdquo;</p>
                                    </div>
                                )}
                                <p className="text-gray-500 text-sm mt-4">
                                    Please review the reason and update your registration details to resubmit for approval.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-gray-600 text-lg">
                                    Thank you for registering, <span className="font-semibold text-orange-600">{user?.email}</span>!
                                </p>
                                <p className="text-gray-600">
                                    Your registration has been submitted successfully and is currently under review by our administrators.
                                </p>
                            </>
                        )}

                        {/* Info Box */}
                        <div className={`${isAlreadyApproved ? 'bg-green-50 border-green-200' : isRejected ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'} border rounded-lg p-4 mt-4 text-left`}>
                            {isAlreadyApproved ? (
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-green-800 mb-1">What&apos;s next?</p>
                                        <p className="text-sm text-green-700">
                                            You can now access your dashboard to track your sadhana, view events, and connect with your mentors.
                                        </p>
                                    </div>
                                </div>
                            ) : isRejected ? (
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-800 mb-1">How to fix this?</p>
                                        <ul className="text-sm text-red-700 space-y-1">
                                            <li>• Click on &quot;Update Registration&quot; below</li>
                                            <li>• Fix the details mentioned in the reason</li>
                                            <li>• Resubmit your application</li>
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-orange-800 mb-1">What happens next?</p>
                                        <ul className="text-sm text-orange-700 space-y-1">
                                            <li>• Admin will review your registration</li>
                                            <li>&bull; You&apos;ll receive access once approved</li>
                                            <li>• This usually takes 24-48 hours</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 ${isAlreadyApproved ? 'bg-green-100 text-green-800' : isRejected ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {isAlreadyApproved ? <CheckCircle2 className="w-4 h-4" /> : isRejected ? <XCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        Status: {isAlreadyApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending Approval'}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        {/* Camp Registration is available even during pending status */}
                        {!isAlreadyApproved && !isRejected && (
                            <button
                                onClick={() => router.push('/dashboard/camp')}
                                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ring-2 ring-orange-300 ring-offset-2"
                            >
                                ⛺ Browse & Register for Camps
                            </button>
                        )}

                        {/* Primary Button */}
                        <button
                            onClick={() => router.push(isAlreadyApproved ? '/dashboard' : isRejected ? '/auth/complete-registration' : '/')}
                            className={`w-full text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${isRejected ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600' : 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900'}`}
                        >
                            {isAlreadyApproved ? (
                                <>
                                    <Home className="w-5 h-5" />
                                    Go to Dashboard
                                </>
                            ) : isRejected ? (
                                <>
                                    <Edit3 className="w-5 h-5" />
                                    Update Registration
                                </>
                            ) : (
                                <>
                                    <Home className="w-5 h-5" />
                                    Go to Home
                                </>
                            )}
                        </button>

                        {/* Sign Out Button */}
                        <button
                            onClick={handleSignOut}
                            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </button>
                    </div>

                    {/* Check Status Link */}
                    <div className="mt-6">
                        <button
                            onClick={() => window.location.reload()}
                            className="text-sm text-orange-600 hover:text-orange-800 underline"
                        >
                            Check Status Again
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
