import React, { useMemo } from 'react';
import { User } from '@/types';
import { Users, UserPlus, Crown, Star } from 'lucide-react';
import { getRoleHierarchyNumber } from '@/lib/utils/roles';

interface StatsSectionProps {
    users: User[];
    totalCount?: number;
    isFiltered?: boolean;
}

export default function StatsSection({ users, totalCount, isFiltered }: StatsSectionProps) {
    const stats = useMemo(() => {
        const total = users.length;
        const pending = users.filter(u => u.verificationStatus === 'pending').length;

        // Role Categories
        const leadership = users.filter(u => {
            const roles = Array.isArray(u.role) ? u.role : [u.role];
            return roles.some(r => {
                const num = getRoleHierarchyNumber(r);
                return num >= 8; // Super Admin (8) to OC (17)
            });
        }).length;

        const counselors = users.filter(u => {
            const roles = Array.isArray(u.role) ? u.role : [u.role];
            return roles.some(r => r === 'counselor' || r === 2 || r === 'voice_manager' || r === 3);
        }).length;

        return {
            total,
            pending,
            leadership,
            counselors
        };
    }, [users]);

    const cards = [
        {
            title: isFiltered ? 'Filtered Users' : 'Total Users',
            value: stats.total,
            icon: Users,
            gradient: 'from-blue-500 via-indigo-500 to-violet-500',
            desc: isFiltered && totalCount !== undefined ? `of ${totalCount} members` : 'Active members'
        },
        {
            title: 'Pending Approvals',
            value: stats.pending,
            icon: UserPlus,
            gradient: 'from-amber-400 via-orange-500 to-red-500',
            desc: 'Action required'
        },
        {
            title: 'Leadership Team',
            value: stats.leadership,
            icon: Crown,
            gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
            desc: 'Admins & Directors'
        },
        {
            title: 'Voice Team',
            value: stats.counselors,
            icon: Star,
            gradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
            desc: 'Counselors & Voice Managers'
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
            {cards.map((card) => (
                <div
                    key={card.title}
                    className="relative overflow-hidden rounded-xl p-2.5 sm:p-3 bg-white border border-slate-300 shadow-xs hover:border-slate-400 hover:shadow-sm transition-all duration-200 group"
                >
                    {/* Subtle Background Accent */}
                    <div className={`absolute top-0 right-0 w-14 h-14 bg-gradient-to-br ${card.gradient} opacity-10 rounded-full blur-xl -mr-3 -mt-3 transition-opacity group-hover:opacity-20`} />

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                            <div className={`inline-flex p-1.5 rounded-lg bg-gradient-to-br ${card.gradient} text-white shadow-2xs`}>
                                <card.icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-base sm:text-xl font-black text-slate-900 font-display tracking-tight">
                                {card.value.toLocaleString()}
                            </span>
                        </div>

                        <div className="space-y-0.2">
                            <h3 className="text-slate-600 text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider truncate">{card.title}</h3>
                            <p className={`text-[9px] sm:text-[9.5px] font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent truncate`}>
                                {card.desc}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
