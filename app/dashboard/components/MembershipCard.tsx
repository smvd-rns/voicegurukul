'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/components/providers/AuthProvider';
import { Shield, CreditCard, Sparkles, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function MembershipCard() {
    const { user, userData } = useAuth();
    const [membershipId, setMembershipId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        console.log('MembershipCard: userData', userData);
    }, [userData]);

    useEffect(() => {
        const fetchMembershipId = async () => {
            if (!user || !supabase) return;
            try {
                const { data, error } = await supabase
                    .from('membership_ids')
                    .select('membership_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;
                if (data) setMembershipId(data.membership_id);
            } catch (err: any) {
                console.error('Error fetching membership ID:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMembershipId();
    }, [user]);

    const handleGenerate = async () => {
        if (!supabase) return;
        setGenerating(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/membership/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to generate ID');

            setMembershipId(result.membershipId);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl p-6 border border-white/60 animate-pulse">
                <div className="h-6 w-32 bg-slate-200 rounded mb-4"></div>
                <div className="h-10 w-full bg-slate-100 rounded-xl"></div>
            </div>
        );
    }

    const hasRequiredData = (userData?.introducedToKcIn || userData?.hierarchy?.introducedToKcIn) && 
                          (userData?.parentTemple || userData?.hierarchy?.parentTemple);

    return (
        <div className="group relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl border border-white/10 transition-all duration-300 hover:shadow-orange-900/20">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/20 transition-all" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -ml-12 -mb-12" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3.5 sm:mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-md">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Membership Status</h2>
                    </div>
                    {membershipId && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                        </div>
                    )}
                </div>

                {membershipId ? (
                    <div className="space-y-3">
                        <div className="relative p-3.5 sm:p-4 rounded-xl bg-white/5 border border-white/10 overflow-hidden group/id">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-transparent opacity-0 group-hover/id:opacity-100 transition-opacity" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Membership ID</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xl sm:text-2xl font-black text-white tracking-widest font-mono">
                                    {membershipId}
                                </span>
                                <CreditCard className="w-6 h-6 text-orange-500/50 group-hover/id:scale-110 transition-transform" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 font-medium px-1">
                            Use this ID for all official communications and events.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="p-3 sm:p-3.5 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                            <div className="flex gap-3">
                                <AlertCircle className={`w-5 h-5 shrink-0 ${hasRequiredData ? 'text-amber-400' : 'text-slate-400'}`} />
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-slate-200">
                                        {hasRequiredData ? 'Ready to Generate' : 'Profile Incomplete'}
                                    </h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        {hasRequiredData 
                                            ? 'Your profile contains all details needed for ID generation.' 
                                            : 'Please update your "Introduced to KC" date and "Parent Temple" in your profile first.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={!hasRequiredData || generating}
                            className={`w-full group/btn relative flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all overflow-hidden ${
                                hasRequiredData 
                                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:scale-[0.98]' 
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    <span>Generating ID...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 text-orange-200 group-hover/btn:rotate-12 transition-transform" />
                                    <span>Get Membership ID</span>
                                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
