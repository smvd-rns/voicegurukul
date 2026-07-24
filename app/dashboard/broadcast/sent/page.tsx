'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Mail, TrendingUp, Users, Eye, EyeOff, Calendar, Filter, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import { format } from 'date-fns';

interface SentMessage {
    id: string;
    subject: string;
    content: string;
    priority: string;
    category: string;
    createdAt: string;
    totalRecipients: number;
    readCount: number;
    unreadCount: number;
    readPercentage: number;
}

export default function SentMessagesPage() {
    const { userData } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState<SentMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'read-high' | 'read-low' | 'recipients-high'>('date-desc');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);

    const fetchSentMessages = useCallback(async () => {
        try {
            const { data: { session } } = await supabase!.auth.getSession();
            

            const response = await fetch('/api/broadcast/sent', {
                headers: {
                    ...(session?.access_token ? { "Authorization": `Bearer ${session?.access_token}` } : {}),
                },
            });

            const data = await response.json();
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error('Error fetching sent messages:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (userData) {
            // Helper to get numeric role level
            const getRoleLevel = (role: any): number => {
                if (typeof role === 'number') return role;
                const roleMap: Record<string, number> = {
                    'super_admin': 8,
                    'zonal_admin': 7,
                    'state_admin': 6,
                    'city_admin': 5,
                    'center_admin': 4,
                    'bc_voice_manager': 4,
                    'voice_manager': 3,
                    'senior_counselor': 3,
                    'counselor': 2,
                    'student': 1
                };
                return roleMap[role] || 1;
            };

            const userRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
            const maxRole = Math.max(...userRoles.map(getRoleLevel));

            // Allow access if maxRole >= 4
            if (maxRole < 4) {
                router.push('/dashboard');
                return;
            }

            fetchSentMessages();
        }
    }, [userData, router, fetchSentMessages]);

    const handleDelete = async (messageId: string) => {
        try {
            const { data: { session } } = await supabase!.auth.getSession();
            

            const response = await fetch(`/api/broadcast/${messageId}/delete`, {
                method: 'DELETE',
                headers: {
                    ...(session?.access_token ? { "Authorization": `Bearer ${session?.access_token}` } : {}),
                },
            });

            if (response.ok) {
                setMessages(prev => prev.filter(msg => msg.id !== messageId));
                setDeleteMessageId(null);
            } else {
                console.error('Failed to delete message');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const filteredMessages = messages.filter((msg) => {
        const matchesSearch = msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !filterCategory || msg.category === filterCategory;

        const msgDate = new Date(msg.createdAt);
        const matchesStartDate = !startDate || msgDate >= new Date(startDate);
        const matchesEndDate = !endDate || msgDate <= new Date(new Date(endDate).setHours(23, 59, 59));

        return matchesSearch && matchesCategory && matchesStartDate && matchesEndDate;
    }).sort((a, b) => {
        switch (sortBy) {
            case 'date-desc':
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'date-asc':
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'read-high':
                return b.readPercentage - a.readPercentage;
            case 'read-low':
                return a.readPercentage - b.readPercentage;
            case 'recipients-high':
                return b.totalRecipients - a.totalRecipients;
            default:
                return 0;
        }
    });

    const totalStats = {
        totalMessages: messages.length,
        totalRecipients: messages.reduce((sum, msg) => sum + msg.totalRecipients, 0),
        totalRead: messages.reduce((sum, msg) => sum + msg.readCount, 0),
        avgReadRate: messages.length > 0
            ? Math.round(messages.reduce((sum, msg) => sum + msg.readPercentage, 0) / messages.length)
            : 0,
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-orange-700 font-semibold">Loading sent messages...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-4 sm:py-8 px-2 sm:px-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center mb-6">
                    <p className="text-lg font-serif text-orange-700 font-semibold mb-2">Hare Krishna</p>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display bg-gradient-to-r from-orange-600 via-orange-700 to-amber-600 bg-clip-text text-transparent mb-3 py-1">
                        Sent Broadcast Messages
                    </h1>
                    <p className="text-base text-gray-700 font-medium">Track your broadcast message analytics</p>

                    {/* Retention Warning for Role 4 (Center Admin) Users */}
                    {userData && (
                        (() => {
                            const getRoleLevel = (role: any): number => {
                                if (typeof role === 'number') return role;
                                const roleMap: Record<string, number> = {
                                    'super_admin': 8, 'zonal_admin': 7, 'state_admin': 6, 'city_admin': 5,
                                    'center_admin': 4, 'bc_voice_manager': 4, 'voice_manager': 3,
                                    'senior_counselor': 3, 'counselor': 2, 'student': 1
                                };
                                return roleMap[role] || 1;
                            };
                            // We use the same calculation logic inline or could lift to state if cleaner, 
                            // but here is fine for a simple render check.
                            // We check if their max role is EXACTLY 4 (or less than 8 effectively for this warning).
                            // User request: "only role 4 user not to admin role 8 user".
                            // To be safe and helpful, we show it to anyone NOT Super Admin (Role 8).
                            // Or strictly Role 4 if that's the specific retention policy target.
                            // Let's stick to "Not Super Admin" as a safe default for "admin role 8 user" exclusion.
                            const userRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
                            const maxRole = Math.max(...userRoles.map(getRoleLevel));

                            // Show only if maxRole is 4 (BC Voice Manager / Center Admin)
                            if (maxRole === 4) {
                                return (
                                    <div className="mt-4 max-w-2xl mx-auto bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md shadow-sm text-left flex items-start gap-3">
                                        <div className="text-amber-500 mt-0.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-amber-800 text-sm">Attention</p>
                                            <p className="text-amber-700 text-sm mt-1">
                                                To maintain digital cleanliness for our service, messages older than 1 month are automatically cleared.
                                            </p>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()
                    )}
                </div>

                {/* Stats Cards */}
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-blue-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Messages</p>
                                <p className="text-xl sm:text-3xl font-bold text-blue-600">{totalStats.totalMessages}</p>
                            </div>
                            <Mail className="h-8 w-8 sm:h-12 sm:w-12 text-blue-400" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-purple-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Recipients</p>
                                <p className="text-xl sm:text-3xl font-bold text-purple-600">{totalStats.totalRecipients}</p>
                            </div>
                            <Users className="h-8 w-8 sm:h-12 sm:w-12 text-purple-400" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-green-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Read</p>
                                <p className="text-xl sm:text-3xl font-bold text-green-600">{totalStats.totalRead}</p>
                            </div>
                            <Eye className="h-8 w-8 sm:h-12 sm:w-12 text-green-400" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-orange-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs sm:text-sm text-gray-600 font-medium">Avg Read Rate</p>
                                <p className="text-xl sm:text-3xl font-bold text-orange-600">{totalStats.avgReadRate}%</p>
                            </div>
                            <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 text-orange-400" />
                        </div>
                    </div>
                </div>

                {/* Filters & Controls */}
                <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search messages..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            />
                        </div>

                        {/* Filters Grid */}
                        <div className="grid grid-cols-2 gap-3 md:min-w-[400px]">
                            {/* Category - Spans 1 col on mobile */}
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white text-sm"
                            >
                                <option value="">All Categories</option>
                                <option value="spiritual">Spiritual</option>
                                <option value="administrative">Administrative</option>
                                <option value="events">Events</option>
                            </select>

                            {/* Sort By - Spans 1 col on mobile */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white text-sm"
                            >
                                <option value="date-desc">Newest First</option>
                                <option value="date-asc">Oldest First</option>
                                <option value="read-desc">Most Read</option>
                                <option value="read-asc">Least Read</option>
                            </select>
                        </div>


                    </div>
                </div>

                {/* Messages List */}
                <div className="space-y-4">
                    {filteredMessages.length === 0 ? (
                        <div className="bg-white rounded-xl p-12 text-center shadow-lg">
                            <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No messages found</p>
                        </div>
                    ) : (
                        filteredMessages.map((message) => (
                            <div
                                key={message.id}
                                className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200 hover:border-orange-400 hover:shadow-xl transition-all relative group"
                            >
                                <div className="absolute top-4 right-4 z-10 opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteMessageId(message.id);
                                        }}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Message"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 6h18"></path>
                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>

                                <div
                                    onClick={() => router.push(`/dashboard/broadcast/analytics/${message.id}`)}
                                    className="cursor-pointer"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div className="flex-1 pr-12">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <h3 className="text-xl font-bold text-gray-900">{message.subject}</h3>
                                                {message.priority === 'urgent' && (
                                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                                                        URGENT
                                                    </span>
                                                )}
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded capitalize">
                                                    {message.category}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 line-clamp-2 mb-3">{message.content}</p>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {format(new Date(message.createdAt), 'MMM d, yyyy h:mm a')}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users className="h-4 w-4" />
                                                    {message.totalRecipients} recipients
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex sm:flex-col gap-4 sm:gap-2 sm:items-end min-w-[100px] sm:pt-8">
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-green-600">{message.readPercentage}%</div>
                                                <div className="text-xs text-gray-500">Read Rate</div>
                                            </div>
                                            <div className="flex gap-4 text-sm justify-center">
                                                <div className="text-center">
                                                    <div className="font-bold text-green-600">{message.readCount}</div>
                                                    <div className="text-xs text-gray-500">Read</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-bold text-red-600">{message.unreadCount}</div>
                                                    <div className="text-xs text-gray-500">Unread</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-4">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                                                style={{ width: `${message.readPercentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {deleteMessageId && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                            <div className="text-center mb-6">
                                <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                                        <path d="M3 6h18"></path>
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Message?</h3>
                                <p className="text-gray-600">
                                    Are you sure you want to delete this specific message? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteMessageId(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteMessageId)}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
