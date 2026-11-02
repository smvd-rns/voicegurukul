'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
    Clock, 
    Home, 
    LogOut, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    Edit3, 
    UserCheck, 
    Phone, 
    MessageCircle, 
    Sparkles, 
    ShieldCheck, 
    RefreshCw, 
    ArrowRight,
    Building2,
    Palette
} from 'lucide-react';

interface ApprovalManagerInfo {
    name: string;
    role: string;
    phone: string | null;
    email: string | null;
}

type BgTheme = 'midnight' | 'sunset' | 'cool';

export default function PendingApprovalPage() {
    const { user, userData, loading, signOut } = useAuth();
    const router = useRouter();
    const [isAlreadyApproved, setIsAlreadyApproved] = useState(false);
    const [managerInfo, setManagerInfo] = useState<ApprovalManagerInfo | null>(null);
    const [centerName, setCenterName] = useState<string | null>(null);
    const [templeName, setTempleName] = useState<string | null>(null);
    const [loadingManager, setLoadingManager] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [bgTheme, setBgTheme] = useState<BgTheme>('midnight');

    const isRejected = userData?.verificationStatus === 'rejected';

    // Persist chosen theme if user selects one
    useEffect(() => {
        const saved = localStorage.getItem('pending_bg_theme') as BgTheme;
        if (saved && ['midnight', 'sunset', 'cool'].includes(saved)) {
            setBgTheme(saved);
        }
    }, []);

    const changeTheme = (theme: BgTheme) => {
        setBgTheme(theme);
        try {
            localStorage.setItem('pending_bg_theme', theme);
        } catch {}
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
            return;
        }

        if (!loading && user && !userData) {
            router.push('/auth/complete-registration');
            return;
        }

        if (!loading && userData?.verificationStatus === 'approved') {
            setIsAlreadyApproved(true);
            return;
        }

        if (!loading && (userData?.verificationStatus === 'incomplete' || userData?.verificationStatus === 'unverified')) {
            router.push('/auth/complete-registration');
            return;
        }
    }, [user, userData, loading, router]);

    // Fetch Acting Manager details
    useEffect(() => {
        let isMounted = true;

        async function fetchApprovalManager() {
            if (!user) return;
            try {
                const centerParam = userData?.hierarchy?.currentCenter || (userData as any)?.currentCenter || userData?.hierarchy?.center || '';
                const res = await fetch(`/api/auth/approval-manager?userId=${encodeURIComponent(user.id)}&center=${encodeURIComponent(centerParam)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        if (data.manager) {
                            setManagerInfo(data.manager);
                        }
                        if (data.centerName) {
                            setCenterName(data.centerName);
                        }
                        if (data.templeName) {
                            setTempleName(data.templeName);
                        }
                    }
                }
            } catch (err) {
                console.warn('Failed to load approval manager:', err);
            } finally {
                if (isMounted) {
                    setLoadingManager(false);
                }
            }
        }

        if (user) {
            fetchApprovalManager();
        }

        return () => {
            isMounted = false;
        };
    }, [user, userData]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/auth/login');
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setTimeout(() => {
            window.location.reload();
        }, 400);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
                <div className="text-center p-6 sm:p-8 bg-slate-900/90 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-800 max-w-xs w-full">
                    <div className="relative w-12 h-12 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-orange-500 animate-ping opacity-40"></div>
                        <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-xs sm:text-sm font-semibold text-slate-300">Loading your profile status...</p>
                </div>
            </div>
        );
    }

    const displayName = userData?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Devotee';
    const locationTag = centerName || templeName;
    const whatsappMessage = encodeURIComponent(
        `Hare Krishna Prabhuji! I have registered on VOICE Gurukul (${displayName}) and my account is pending verification. Could you please review and approve it? Thank you!`
    );

    // Theme configuration
    const themeStyles = {
        midnight: {
            wrapper: 'bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-15%,rgba(249,115,22,0.35),rgba(15,23,42,0))] text-slate-100',
            orb1: 'bg-orange-600/20',
            orb2: 'bg-amber-500/15',
            card: 'bg-white shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/20',
            brandBadge: 'text-amber-300 bg-white/10 border-white/15',
            switcherBg: 'bg-slate-900/80 border-slate-700/80 text-white',
        },
        sunset: {
            wrapper: 'bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 text-white',
            orb1: 'bg-yellow-400/20',
            orb2: 'bg-rose-500/20',
            card: 'bg-white shadow-[0_20px_60px_rgba(154,52,18,0.35)] border border-orange-200/50',
            brandBadge: 'text-white bg-black/20 border-white/20',
            switcherBg: 'bg-black/30 border-white/20 text-white',
        },
        cool: {
            wrapper: 'bg-gradient-to-br from-slate-100 via-slate-200/80 to-zinc-200 text-slate-800',
            orb1: 'bg-orange-400/10',
            orb2: 'bg-slate-300/30',
            card: 'bg-white shadow-[0_20px_50px_rgba(15,23,42,0.12)] border border-slate-200/90',
            brandBadge: 'text-slate-700 bg-slate-200/70 border-slate-300/80',
            switcherBg: 'bg-white/90 border-slate-200/90 text-slate-700 shadow-xs',
        },
    };

    const currentTheme = themeStyles[bgTheme];

    return (
        <div className={`min-h-screen ${currentTheme.wrapper} flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-10 relative overflow-hidden transition-colors duration-500`}>
            {/* Ambient background glow orbs */}
            <div className={`absolute -top-32 -left-32 w-72 sm:w-[500px] h-72 sm:h-[500px] ${currentTheme.orb1} rounded-full blur-3xl pointer-events-none transition-all duration-700`}></div>
            <div className={`absolute -bottom-32 -right-32 w-72 sm:w-[500px] h-72 sm:h-[500px] ${currentTheme.orb2} rounded-full blur-3xl pointer-events-none transition-all duration-700`}></div>

            {/* Top Navigation Row: Brand + Theme Switcher (Properly spaced above card, never overlapping on mobile) */}
            <div className="w-full max-w-lg flex items-center justify-between mb-3.5 px-2 relative z-20">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border backdrop-blur-md ${currentTheme.brandBadge}`}>
                    <span>VOICE Gurukul</span>
                </div>

                <div className={`flex items-center gap-1 p-1 rounded-full border backdrop-blur-md transition-all shadow-xs text-xs font-semibold ${currentTheme.switcherBg}`}>
                    <Palette className="w-3 h-3 ml-1.5 opacity-70" />
                    <button 
                        onClick={() => changeTheme('midnight')} 
                        className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all ${
                            bgTheme === 'midnight' 
                                ? 'bg-orange-600 text-white shadow-xs' 
                                : 'opacity-70 hover:opacity-100'
                        }`}
                    >
                        Midnight
                    </button>
                    <button 
                        onClick={() => changeTheme('sunset')} 
                        className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all ${
                            bgTheme === 'sunset' 
                                ? 'bg-orange-600 text-white shadow-xs' 
                                : 'opacity-70 hover:opacity-100'
                        }`}
                    >
                        Sunset
                    </button>
                    <button 
                        onClick={() => changeTheme('cool')} 
                        className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all ${
                            bgTheme === 'cool' 
                                ? 'bg-orange-600 text-white shadow-xs' 
                                : 'opacity-70 hover:opacity-100'
                        }`}
                    >
                        Silver
                    </button>
                </div>
            </div>

            {/* Main Center Card */}
            <div className="max-w-lg w-full relative z-10">
                <div className={`${currentTheme.card} rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center transition-all duration-500 text-slate-800`}>
                    
                    {/* Top Status Header */}
                    <div className="mb-4 sm:mb-6 flex flex-col items-center">
                        <div className="relative mb-3">
                            <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl blur-xl opacity-40 ${
                                isAlreadyApproved ? 'bg-emerald-400' : isRejected ? 'bg-rose-400' : 'bg-gradient-to-tr from-amber-400 to-orange-500'
                            }`}></div>
                            <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 ${
                                isAlreadyApproved 
                                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-500/25' 
                                    : isRejected 
                                    ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-rose-500/25' 
                                    : 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-orange-500/25'
                            }`}>
                                {isAlreadyApproved ? (
                                    <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
                                ) : isRejected ? (
                                    <XCircle className="w-8 h-8 sm:w-10 sm:h-10" />
                                ) : (
                                    <Clock className="w-8 h-8 sm:w-10 sm:h-10 animate-[spin_12s_linear_infinite]" />
                                )}
                            </div>
                        </div>

                        {/* Status Chip */}
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 border ${
                            isAlreadyApproved 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : isRejected 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : 'bg-amber-50 text-amber-800 border-amber-200/80 shadow-xs'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${
                                isAlreadyApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500 animate-ping'
                            }`}></span>
                            {isAlreadyApproved ? 'Account Approved' : isRejected ? 'Application Rejected' : 'Approval In Progress'}
                        </div>

                        <h1 className="text-xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                            {isAlreadyApproved ? 'Welcome to VOICE Gurukul!' : isRejected ? 'Application Not Approved' : 'Approval Pending'}
                        </h1>

                        <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-sm">
                            Hare Krishna, <span className="font-semibold text-slate-800">{displayName}</span>
                        </p>
                    </div>

                    {/* Body Content */}
                    <div className="space-y-3.5 mb-5 sm:mb-6">
                        {isAlreadyApproved ? (
                            <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl sm:rounded-2xl text-left flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
                                    Your account is verified and ready. You now have full access to sadhana tracking, courses, and center community events.
                                </div>
                            </div>
                        ) : isRejected ? (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl sm:rounded-2xl text-left space-y-2.5">
                                <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs sm:text-sm">
                                    <AlertCircle className="w-4 h-4 text-rose-600" />
                                    Reason for Rejection:
                                </div>
                                <p className="text-xs sm:text-sm text-rose-900 italic bg-white/80 p-3 rounded-xl border border-rose-200">
                                    &ldquo;{userData?.rejectionReason || 'Details provided need revision.'}&rdquo;
                                </p>
                                <p className="text-[11px] sm:text-xs text-rose-700">
                                    Please click &ldquo;Update Registration&rdquo; below to update your information and resubmit.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Modern Acting Manager Card (Responsive Mobile Layout) */}
                                <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-white border border-amber-200/90 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 text-left shadow-sm relative overflow-hidden group">
                                    {/* Top decorative accent */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500"></div>

                                    {/* Badges Row */}
                                    <div className="flex items-center justify-between gap-1.5 mb-2.5 flex-wrap">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-600 text-white shadow-xs">
                                                {managerInfo?.role || 'Acting Manager'}
                                            </span>
                                            {locationTag && (
                                                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-slate-600 bg-white/80 px-2 py-0.5 rounded-full border border-orange-200/60 max-w-[170px] truncate">
                                                    <Building2 className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                                    <span className="truncate">{locationTag}</span>
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md flex items-center gap-1 flex-shrink-0">
                                            <ShieldCheck className="w-3 h-3 text-amber-600" /> Reviewer
                                        </span>
                                    </div>

                                    {/* Reviewer Info */}
                                    <div className="flex items-center gap-3 my-2 sm:my-3">
                                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold text-base sm:text-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-500/20">
                                            {managerInfo?.name ? (
                                                managerInfo.name.charAt(0).toUpperCase()
                                            ) : (
                                                <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                                                {managerInfo?.name || 'Center Acting Manager'}
                                            </h3>
                                            <p className="text-[11px] sm:text-xs text-orange-800 font-medium">
                                                Request has been routed to him for quick approval
                                            </p>
                                        </div>
                                    </div>

                                    {/* Direct Contact Buttons (Mobile-Optimized Grid) */}
                                    <div className="mt-3 pt-3 border-t border-orange-200/70">
                                        <div className="text-[11px] sm:text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span>Contact for quick approval:</span>
                                        </div>

                                        {managerInfo?.phone ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                <a
                                                    href={`tel:${managerInfo.phone}`}
                                                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-orange-50 text-slate-800 border border-orange-200 rounded-xl text-xs font-bold shadow-xs hover:border-orange-300 transition-all active:scale-[0.98]"
                                                >
                                                    <Phone className="w-3.5 h-3.5 text-orange-600" />
                                                    <span className="truncate">{managerInfo.phone}</span>
                                                </a>
                                                <a
                                                    href={`https://wa.me/${managerInfo.phone.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    <span>WhatsApp</span>
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-slate-500 italic">
                                                Please contact your center coordinator
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Modern Progress Timeline */}
                                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-left">
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Approval Process</p>
                                    
                                    <div className="space-y-2.5 sm:space-y-3">
                                        {/* Step 1 */}
                                        <div className="flex items-start gap-2.5">
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] sm:text-xs font-bold text-slate-800">Registration Details Submitted</p>
                                                <p className="text-[10px] sm:text-[11px] text-slate-500">Your profile information is saved securely.</p>
                                            </div>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="flex items-start gap-2.5">
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5 ring-2 ring-amber-300 ring-offset-1">
                                                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] sm:text-xs font-bold text-amber-900">
                                                    Review by {managerInfo?.role || 'Acting Manager'}
                                                    {managerInfo?.name && <span className="text-orange-700 font-extrabold"> ({managerInfo.name})</span>}
                                                </p>
                                                <p className="text-[10px] sm:text-[11px] text-amber-800">
                                                    Reach out directly via Call or WhatsApp for same-day activation.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="flex items-start gap-2.5 opacity-60">
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] sm:text-[11px] font-bold">
                                                3
                                            </div>
                                            <div>
                                                <p className="text-[11px] sm:text-xs font-bold text-slate-700">Full Dashboard Access Unlocked</p>
                                                <p className="text-[10px] sm:text-[11px] text-slate-500">Sadhana tracking, seminars, and connect with mentors.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        {/* Camp Registration is available even during pending status */}
                        {!isAlreadyApproved && !isRejected && (
                            <button
                                onClick={() => router.push('/dashboard/camp')}
                                className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-700 hover:to-amber-700 text-white py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-[0.99]"
                            >
                                <span>⛺</span>
                                <span>Browse & Register for Camps</span>
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </button>
                        )}

                        {/* Secondary Button Row */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => router.push(isAlreadyApproved ? '/dashboard' : isRejected ? '/auth/complete-registration' : '/')}
                                className={`py-2.5 sm:py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] ${
                                    isRejected 
                                        ? 'col-span-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white' 
                                        : isAlreadyApproved 
                                        ? 'col-span-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-emerald-500/20'
                                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
                                }`}
                            >
                                {isAlreadyApproved ? (
                                    <>
                                        <Home className="w-4 h-4" />
                                        Go to Dashboard
                                    </>
                                ) : isRejected ? (
                                    <>
                                        <Edit3 className="w-4 h-4" />
                                        Update Registration
                                    </>
                                ) : (
                                    <>
                                        <Home className="w-4 h-4" />
                                        Home
                                    </>
                                )}
                            </button>

                            {!isRejected && !isAlreadyApproved && (
                                <button
                                    onClick={handleSignOut}
                                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 py-2.5 sm:py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.99]"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Refresh Link */}
                    <div className="mt-3.5 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-center">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors py-1 px-3 rounded-lg hover:bg-orange-50 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span>{isRefreshing ? 'Checking...' : 'Check Status Again'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
