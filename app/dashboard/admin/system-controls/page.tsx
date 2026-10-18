'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Sliders, ArrowLeft, ShieldCheck, Lock, Unlock,
    Loader2, Sparkles, Check, AlertTriangle, Layers,
    Info, RefreshCw, Shield, HelpCircle
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useSystemConfigs } from '@/hooks/useSystemConfigs';

export interface SystemControlItem {
    key: string;
    title: string;
    category: string;
    categoryColor: string;
    description: string;
    icon: any;
    affectedScope: string;
    activeLabel: string;
    inactiveLabel: string;
    details: string[];
}

const SYSTEM_CONTROLS: SystemControlItem[] = [
    {
        key: 'profile_completion_15_day_lock',
        title: 'Mandatory 15-Day Profile Completion Lock',
        category: 'Profile & Security',
        categoryColor: 'bg-amber-100 text-amber-800 border-amber-200',
        description: 'Enforces mandatory profile completion for devotee accounts registered more than 15 days ago.',
        details: [
            'When Enabled: Devotees registered >15 days ago must complete basic spiritual info, profile photo, Aadhar card, and camp/book completion before accessing other dashboard sections.',
            'When Disabled: All devotees can freely navigate to all dashboard pages without any lock or restriction.',
            'Exceptions: Profile and Donation pages remain accessible at all times so devotees can update info or contribute.',
        ],
        icon: ShieldCheck,
        affectedScope: '/dashboard/*',
        activeLabel: 'Enforced (Locked after 15 days)',
        inactiveLabel: 'Bypassed (Free Navigation)',
    },
];

export default function SystemControlsPage() {
    const { user, userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const { configs, loading: configsLoading, refresh, updateConfig, isEnabled } = useSystemConfigs();
    const [updatingKey, setUpdatingKey] = useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Authorization verification
    const currentUserRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
    const isSuperAdmin = currentUserRoles.some((r: any) => String(r) === '8' || String(r) === 'super_admin');

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/auth/login');
                return;
            }
            if (!isSuperAdmin) {
                router.push('/dashboard/admin');
            }
        }
    }, [user, isSuperAdmin, authLoading, router]);

    const handleToggle = async (key: string, currentVal: boolean) => {
        if (!isSuperAdmin || updatingKey) return;

        setUpdatingKey(key);
        setFeedbackMessage(null);
        const newVal = !currentVal;

        const res = await updateConfig(key, newVal);
        setUpdatingKey(null);

        if (res.success) {
            setFeedbackMessage({
                text: `Control updated: ${newVal ? 'Enabled' : 'Disabled'}`,
                type: 'success',
            });
            setTimeout(() => setFeedbackMessage(null), 4000);
        } else {
            setFeedbackMessage({
                text: res.error || 'Failed to update control setting',
                type: 'error',
            });
        }
    };

    if (authLoading || (user && !isSuperAdmin)) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
                <p className="text-gray-500 text-sm">Verifying administrative permissions...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-16">
            {/* Navigation & Header */}
            <div>
                <Link
                    href="/dashboard/admin"
                    className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-amber-600 transition-colors mb-4 group"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5 transform group-hover:-translate-x-1 transition-transform" />
                    Back to Admin Dashboard
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                                <Sliders className="w-5 h-5" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                                System Feature Controls
                            </h1>
                        </div>
                        <p className="text-gray-600 text-sm sm:text-base mt-1.5">
                            Centrally configure global platform policies, conditional locks, and feature toggles.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => refresh()}
                            disabled={configsLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-xs transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${configsLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-semibold text-xs shadow-xs">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Super Admin Exclusive</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification alert banner */}
            {feedbackMessage && (
                <div
                    className={`flex items-center justify-between gap-3 p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 border ${
                        feedbackMessage.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {feedbackMessage.type === 'success' ? (
                            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                        <span>{feedbackMessage.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFeedbackMessage(null)}
                        className="text-xs opacity-60 hover:opacity-100"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Controls List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            Available Feature Toggles
                        </h2>
                        <p className="text-xs text-gray-500">
                            Changes take effect immediately across all users and pages.
                        </p>
                    </div>
                    <span className="text-xs font-semibold text-gray-400">
                        {SYSTEM_CONTROLS.length} Total Control{SYSTEM_CONTROLS.length > 1 ? 's' : ''}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {SYSTEM_CONTROLS.map((control) => {
                        const Icon = control.icon;
                        const active = isEnabled(control.key);
                        const isUpdating = updatingKey === control.key;

                        return (
                            <div
                                key={control.key}
                                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                                    active
                                        ? 'bg-white border-amber-300 shadow-md ring-1 ring-amber-200/80'
                                        : 'bg-white border-gray-200 hover:border-gray-300 shadow-xs'
                                }`}
                            >
                                <div className="p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-gray-100">
                                        <div className="flex items-start gap-3.5">
                                            <div
                                                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                    active
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-gray-100 text-gray-500'
                                                }`}
                                            >
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${control.categoryColor}`}>
                                                        {control.category}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-mono">
                                                        Scope: {control.affectedScope}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    {control.title}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Switch button */}
                                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                                            <span className="text-xs font-medium text-gray-500">
                                                {active ? 'Enabled' : 'Disabled'}
                                            </span>
                                            {configsLoading ? (
                                                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                            ) : (
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={active}
                                                    disabled={isUpdating}
                                                    onClick={() => handleToggle(control.key, active)}
                                                    className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                                                        active ? 'bg-amber-600' : 'bg-gray-300'
                                                    }`}
                                                    title={active ? 'Click to Disable' : 'Click to Enable'}
                                                >
                                                    <span className="sr-only">{control.title}</span>
                                                    <span
                                                        aria-hidden="true"
                                                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                                            active ? 'translate-x-6' : 'translate-x-0'
                                                        }`}
                                                    >
                                                        {isUpdating ? (
                                                            <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                                                        ) : active ? (
                                                            <Check className="w-3 h-3 text-amber-600" />
                                                        ) : null}
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description and details */}
                                    <div className="pt-4 space-y-3">
                                        <p className="text-sm text-gray-700 font-medium">
                                            {control.description}
                                        </p>

                                        <ul className="space-y-1.5 text-xs text-gray-600 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                                            {control.details.map((detail, idx) => (
                                                <li key={idx} className="flex items-start gap-2">
                                                    <span className="text-amber-500 mt-0.5">•</span>
                                                    <span>{detail}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Footer status indicator */}
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                                        <span className="text-gray-400">Current Behavior:</span>
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold ${
                                                active
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                            }`}
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-full ${
                                                    active ? 'bg-amber-600 animate-pulse' : 'bg-emerald-500'
                                                }`}
                                            />
                                            {active ? control.activeLabel : control.inactiveLabel}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Extensibility placeholder */}
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-6 text-center flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white border border-gray-200 text-gray-400 flex items-center justify-center mb-3 shadow-xs">
                            <Layers className="w-6 h-6 text-gray-400" />
                        </div>
                        <h4 className="text-base font-bold text-gray-800">
                            Ready For More Controls & Page Locks
                        </h4>
                        <p className="text-xs text-gray-500 max-w-md mt-1 leading-relaxed">
                            This centralized section is built to hold future feature toggles, restrictions, and page controls. Whenever you have additional controls to add, they can simply be registered here.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
