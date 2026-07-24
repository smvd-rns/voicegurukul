'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Users, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import { format } from 'date-fns';

interface User {
    id: string;
    name: string;
}

interface Analytics {
    message: {
        id: string;
        subject: string;
        content: string;
        priority: string;
        category: string;
        createdAt: string;
    };
    stats: {
        totalRecipients: number;
        readCount: number;
        unreadCount: number;
        readPercentage: number;
    };
    readUsers: {
        list: User[];
        grouped: any;
    };
    unreadUsers: {
        list: User[];
        grouped: any;
    };
}

export default function AnalyticsPage({ params }: { params: { messageId: string } }) {
    const { userData } = useAuth();
    const router = useRouter();
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'read' | 'unread'>('unread');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
    const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

    const fetchAnalytics = useCallback(async () => {
        try {
            const { data: { session } } = await supabase!.auth.getSession();
            

            const response = await fetch(`/api/broadcast/analytics/${params.messageId}`, {
                headers: {
                    ...(session?.access_token ? { "Authorization": `Bearer ${session?.access_token}` } : {}),
                },
            });

            const data = await response.json();
            if (data.success) {
                setAnalytics(data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    }, [params.messageId]);

    useEffect(() => {
        if (userData) {
            fetchAnalytics();
        }
    }, [userData, fetchAnalytics]);

    const toggleState = (state: string) => {
        setExpandedStates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(state)) {
                newSet.delete(state);
            } else {
                newSet.add(state);
            }
            return newSet;
        });
    };

    const toggleCity = (stateCity: string) => {
        setExpandedCities(prev => {
            const newSet = new Set(prev);
            if (newSet.has(stateCity)) {
                newSet.delete(stateCity);
            } else {
                newSet.add(stateCity);
            }
            return newSet;
        });
    };

    const renderHierarchy = (grouped: any, usersList: User[]) => {
        const filteredUsers = searchTerm
            ? usersList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
            : null;

        if (filteredUsers && filteredUsers.length > 0) {
            return (
                <div className="space-y-2">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="p-3 bg-white rounded-lg border border-gray-200">
                            <p className="font-medium text-gray-900">{user.name}</p>
                        </div>
                    ))}
                </div>
            );
        }

        if (filteredUsers && filteredUsers.length === 0) {
            return <p className="text-gray-500 text-center py-8">No users found</p>;
        }

        return (
            <div className="space-y-2">
                {Object.keys(grouped).sort().map(state => {
                    const isStateExpanded = expandedStates.has(state);
                    const stateUserCount = Object.values(grouped[state]).reduce(
                        (sum: number, cities: any) =>
                            sum + Object.values(cities).reduce((s: number, users: any) => s + users.length, 0),
                        0
                    );

                    return (
                        <div key={state} className="border border-gray-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleState(state)}
                                className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    {isStateExpanded ? <ChevronDown className="h-5 w-5 text-blue-700" /> : <ChevronRight className="h-5 w-5 text-blue-700" />}
                                    <span className="font-bold text-blue-900">{state}</span>
                                </div>
                                <span className="px-3 py-1 bg-blue-200 text-blue-900 text-sm font-semibold rounded-full">
                                    {stateUserCount} users
                                </span>
                            </button>

                            {isStateExpanded && (
                                <div className="p-2 space-y-2">
                                    {Object.keys(grouped[state]).sort().map(city => {
                                        const stateCityKey = `${state}-${city}`;
                                        const isCityExpanded = expandedCities.has(stateCityKey);
                                        const cityUserCount = Object.values(grouped[state][city]).reduce(
                                            (sum: number, users: any) => sum + users.length,
                                            0
                                        );

                                        return (
                                            <div key={city} className="border border-gray-200 rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => toggleCity(stateCityKey)}
                                                    className="w-full px-4 py-2 bg-green-50 hover:bg-green-100 flex items-center justify-between transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isCityExpanded ? <ChevronDown className="h-4 w-4 text-green-700" /> : <ChevronRight className="h-4 w-4 text-green-700" />}
                                                        <span className="font-semibold text-green-900">{city}</span>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-green-200 text-green-900 text-xs font-semibold rounded-full">
                                                        {cityUserCount}
                                                    </span>
                                                </button>

                                                {isCityExpanded && (
                                                    <div className="p-2 space-y-2">
                                                        {Object.keys(grouped[state][city]).sort().map(center => {
                                                            const users = grouped[state][city][center];
                                                            return (
                                                                <div key={center} className="bg-orange-50 rounded-lg p-3">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="font-medium text-orange-900">{center}</span>
                                                                        <span className="text-xs text-orange-700">{users.length} users</span>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        {users.map((user: User) => (
                                                                            <div key={user.id} className="px-3 py-2 bg-white rounded text-sm text-gray-900 font-medium border border-gray-100">
                                                                                {user.name}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading || !analytics) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-orange-700 font-semibold">Loading analytics...</p>
                </div>
            </div>
        );
    }

    const currentUsers = activeTab === 'read' ? analytics.readUsers : analytics.unreadUsers;

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-4 sm:py-8 px-2 sm:px-4">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <button
                        onClick={() => router.push('/dashboard/broadcast/sent')}
                        className="flex items-center gap-2 text-orange-700 hover:text-orange-900 font-semibold mb-4"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back to Sent Messages
                    </button>

                    <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-orange-200">
                        <h1 className="text-2xl sm:text-3xl font-bold text-orange-700 mb-2">
                            {analytics.message.subject}
                        </h1>
                        <p className="text-gray-600 mb-4">{analytics.message.content}</p>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold capitalize">
                                {analytics.message.category}
                            </span>
                            {analytics.message.priority === 'urgent' && (
                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-semibold">
                                    URGENT
                                </span>
                            )}
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                                {format(new Date(analytics.message.createdAt), 'MMM d, yyyy h:mm a')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-lg text-center border-2 border-purple-200">
                        <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-600">{analytics.stats.totalRecipients}</p>
                        <p className="text-xs text-gray-600">Total</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-lg text-center border-2 border-green-200">
                        <Eye className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{analytics.stats.readCount}</p>
                        <p className="text-xs text-gray-600">Read</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-lg text-center border-2 border-red-200">
                        <EyeOff className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-red-600">{analytics.stats.unreadCount}</p>
                        <p className="text-xs text-gray-600">Unread</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-lg text-center border-2 border-orange-200">
                        <p className="text-2xl font-bold text-orange-600">{analytics.stats.readPercentage}%</p>
                        <p className="text-xs text-gray-600">Read Rate</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
                    <div className="flex border-b-2 border-gray-200">
                        <button
                            onClick={() => setActiveTab('unread')}
                            className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'unread'
                                ? 'bg-red-50 text-red-700 border-b-4 border-red-500'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <EyeOff className="h-5 w-5" />
                                Unread ({analytics.stats.unreadCount})
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('read')}
                            className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'read'
                                ? 'bg-green-50 text-green-700 border-b-4 border-green-500'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Eye className="h-5 w-5" />
                                Read ({analytics.stats.readCount})
                            </div>
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Search */}
                        <div className="mb-4 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            />
                        </div>

                        {/* Hierarchy */}
                        {currentUsers.list.length === 0 ? (
                            <p className="text-gray-500 text-center py-12">No users in this category</p>
                        ) : (
                            renderHierarchy(currentUsers.grouped, currentUsers.list)
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
