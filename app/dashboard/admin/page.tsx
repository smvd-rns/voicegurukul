'use client';

import Link from 'next/link';
import { Users, FileText, Activity, Shield, Settings, UserPlus, Database, AlertCircle, Briefcase, BarChart, UserCircle, Building2, MapPin, UserCheck, CheckCircle2, Upload, Radio, MessageSquare, ChevronRight, CreditCard } from 'lucide-react';

export default function AdminDashboardPage() {
    const adminSections = [
        {
            title: 'Users',
            description: 'Manage all users and roles',
            icon: Users,
            href: '/dashboard/admin/users',
            color: 'text-amber-600',
            bgColor: 'bg-amber-100',
        },
        {
            title: 'Cities',
            description: 'Manage cities data',
            icon: MapPin,
            href: '/dashboard/cities',
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
        },
        {
            title: 'Centers',
            description: 'Manage centers information',
            icon: Building2,
            href: '/dashboard/centers',
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-100',
        },
        {
            title: 'Temples',
            description: 'Manage temples information',
            icon: Building2, // Reusing Building2 for Temples as well
            href: '/dashboard/temples',
            color: 'text-rose-600',
            bgColor: 'bg-rose-100',
        },
        {
            title: 'User Approvals',
            description: 'Review and approve new users',
            icon: Shield,
            href: '/dashboard/admin/user-approvals',
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
        },
        {
            title: 'Data Approvals',
            description: 'Review and approve pending data',
            icon: Shield,
            href: '/dashboard/admin/data-approvals',
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
        },
        {
            title: 'Profile Approvals',
            description: 'Review spiritual info updates',
            icon: UserCheck,
            href: '/dashboard/admin/profile-approvals',
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
        },
        {
            title: 'Request Approval',
            description: 'Manage user role requests',
            icon: CheckCircle2,
            href: '/dashboard/request-approval',
            color: 'text-green-600',
            bgColor: 'bg-green-100',
        },
        {
            title: 'Counselors',
            description: 'Assign counselor roles',
            icon: UserCheck,
            href: '/dashboard/admin/counselors',
            color: 'text-teal-600',
            bgColor: 'bg-teal-100',
        },
        {
            title: 'Event Admins',
            description: 'Manage event broadcast rights',
            icon: Radio,
            href: '/dashboard/admin/event-admins',
            color: 'text-rose-600',
            bgColor: 'bg-rose-100',
        },
        {
            title: 'Import',
            description: 'Import bulk data from files',
            icon: Upload,
            href: '/dashboard/import',
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
        },
        {
            title: 'Broadcast',
            description: 'Send announcements to users',
            icon: Radio,
            href: '/dashboard/broadcast',
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-100',
        },
        {
            title: 'Sent Messages',
            description: 'View broadcast history',
            icon: MessageSquare,
            href: '/dashboard/broadcast/sent',
            color: 'text-sky-600',
            bgColor: 'bg-sky-100',
        },
        {
            title: 'BC Voice Manager',
            description: 'Manage BC Voice operations',
            icon: Briefcase,
            href: '/dashboard/bc-voice-manager',
            color: 'text-violet-600',
            bgColor: 'bg-violet-100',
        },
        {
            title: 'BC Voice Request',
            description: 'Request BC Voice Manager role',
            icon: Briefcase,
            href: '/dashboard/bc-voice-manager-request',
            color: 'text-fuchsia-600',
            bgColor: 'bg-fuchsia-100',
        },
        {
            title: 'Organization View',
            description: 'Hierarchy & Stats Overview',
            icon: BarChart, // Or Activity/LayoutGrid
            href: '/dashboard/admin/organization',
            color: 'text-amber-600',
            bgColor: 'bg-amber-100',
        },
        {
            title: 'Membership',
            description: 'Manage and generate membership IDs',
            icon: CreditCard,
            href: '/dashboard/admin/membership',
            color: 'text-rose-600',
            bgColor: 'bg-rose-100',
        },
        {
            title: 'Email Settings',
            description: 'Manage email templates & triggers',
            icon: Settings,
            href: '/dashboard/admin/email-settings',
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-100',
        },
        {
            title: 'Counselor Dashboard',
            description: 'My Assigned Students',
            icon: UserCircle,
            href: '/dashboard/counselor',
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
        },
        {
            title: 'Managing Director View',
            description: 'Temple-Scoped Dashboard',
            icon: Building2,
            href: '/dashboard/managing-director',
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-100',
        },
        {
            title: 'Data Center',
            description: 'Manage all uploaded resources',
            icon: Database,
            href: '/dashboard/admin/data-center',
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-100',
        },
        {
            title: 'Donation Logs',
            description: 'Audit all platform contributions',
            icon: CreditCard,
            href: '/dashboard/admin/donations',
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
        },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Admin Dashboard
                </h1>
                <p className="text-gray-600 mt-2">
                    Manage system configuration, approvals, and data.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {adminSections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <Link
                            key={section.title}
                            href={section.href}
                            className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Icon className="w-24 h-24 transform rotate-12" />
                            </div>

                            <div className="relative z-10">
                                <div className={`w-12 h-12 ${section.bgColor} rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                                    <Icon className={`w-6 h-6 ${section.color}`} />
                                </div>

                                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-amber-600 transition-colors">
                                    {section.title}
                                </h3>

                                <p className="text-gray-500 text-sm mb-4">
                                    {section.description}
                                </p>

                                <div className="flex items-center text-sm font-semibold text-gray-400 group-hover:text-amber-600 transition-colors">
                                    Access Tool <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
