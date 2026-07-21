'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Radio, Send, AlertCircle, CheckCircle2, Filter, MapPin, Building2, Users, Tent, X, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import { toast } from 'react-hot-toast';

interface FilterOptions {
    states: string[];
    cities: string[];
    centers: string[];
    camps: { value: string; label: string }[];
}

type FilterCategory = 'location' | 'camp' | null;

export default function BroadcastPage() {
    const { userData } = useAuth();
    const router = useRouter();
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
    const [category, setCategory] = useState<'spiritual' | 'administrative' | 'events'>('administrative');
    const [filterCategory, setFilterCategory] = useState<FilterCategory>(null);
    const [filterType, setFilterType] = useState('');
    const [filterValue, setFilterValue] = useState('');
    const [selectedCamps, setSelectedCamps] = useState<string[]>([]);
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [approvedCenters, setApprovedCenters] = useState<string[]>([]);
    const [isRestrictedRole4, setIsRestrictedRole4] = useState(false);

    // Helper to get numeric role level (replicated from backend for consistency)
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

    // Check permissions
    useEffect(() => {
        if (userData) {
            const userRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
            const maxRole = Math.max(...userRoles.map(getRoleLevel));

            // Determine if user is strictly Role 4 (restricted view)
            // If they have a higher role (5, 6, 7, 8), they get standard view (scoped by backend)
            const restrictedRole4 = maxRole === 4;
            setIsRestrictedRole4(restrictedRole4);

            // Allow access if maxRole >= 4
            if (maxRole < 4) {
                router.push('/dashboard');
            }
        }
    }, [userData, router]);

    // Load filter options
    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const response = await fetch('/api/users/filter-options');
                const data = await response.json();
                if (data.success) {
                    setFilterOptions(data.filters);
                }
            } catch (err) {
                console.error('Error loading filter options:', err);
            }
        };
        loadFilterOptions();
    }, []);

    // Load approved centers for BC Voice Managers (Restricted Role 4)
    const [approvedCentersList, setApprovedCentersList] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        const loadApprovedCenters = async () => {
            if (!isRestrictedRole4 || !userData) return;

            try {
                // Fetch approved centers from user profile directly
                const { data: userDataResponse, error } = await supabase!
                    .from('users')
                    .select('bc_voice_manager_approved_centers')
                    .eq('id', userData.id)
                    .single();

                if (userDataResponse?.bc_voice_manager_approved_centers && userDataResponse.bc_voice_manager_approved_centers.length > 0) {
                    const centerIds = userDataResponse.bc_voice_manager_approved_centers;
                    setApprovedCenters(centerIds);

                    // Now fetch details for these centers from 'centers' table
                    const { data: centersData, error: centersError } = await supabase!
                        .from('centers')
                        .select('id, name')
                        .in('id', centerIds);

                    if (centersData) {
                        setApprovedCentersList(((centersData || []) as any[]).map((c: any) => ({ value: c.id.toString(), label: c.name })));
                    } else {
                        // Fallback if fetch fails or no names found
                        setApprovedCentersList(centerIds.map((id: string) => ({ value: id, label: `Center ${id}` })));
                    }
                }
            } catch (err) {
                console.error('Error loading approved centers:', err);
            }
        };

        if (isRestrictedRole4) {
            loadApprovedCenters();
        }
    }, [isRestrictedRole4, userData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const { data: { session } } = await supabase!.auth.getSession();

            if (!session) {
                throw new Error('No active session');
            }

            const response = await fetch('/api/broadcast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    subject,
                    content,
                    priority,
                    category,
                    filterType: filterType || undefined,
                    filterValue: filterValue || undefined,
                    selectedCamps: selectedCamps.length > 0 ? selectedCamps : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send broadcast');
            }

            toast.success(
                <div className="flex flex-col gap-1">
                    <span className="font-bold">Broadcast sent successfully!</span>
                    <span className="text-sm">Delivered to {data.recipientCount} user{data.recipientCount !== 1 ? 's' : ''}.</span>
                </div>,
                { duration: 5000 }
            );

            setRecipientCount(data.recipientCount);
            setSubject('');
            setContent('');
            setPriority('normal');
            setCategory('administrative');
            setSelectedCamps([]);
            clearFilter();

        } catch (err: any) {
            console.error('Error sending broadcast:', err);
            const errorMessage = err.message || 'Failed to send broadcast message';
            setError(errorMessage); // Keep state if needed elsewhere, otherwise just toast
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const clearFilter = () => {
        setFilterCategory(null);
        setFilterType('');
        setFilterValue('');
        setSelectedCamps([]);
        setShowFilterDropdown(false);
    };

    const handleFilterCategorySelect = (cat: FilterCategory) => {
        setFilterCategory(cat);
        setFilterType('');
        setFilterValue('');
        if (cat !== 'camp') {
            setSelectedCamps([]);
        }
    };

    const toggleCamp = (campValue: string) => {
        setSelectedCamps(prev =>
            prev.includes(campValue)
                ? prev.filter(c => c !== campValue)
                : [...prev, campValue]
        );
    };

    const getFilterDisplayText = () => {
        if (selectedCamps.length > 0) {
            return `${selectedCamps.length} Camp${selectedCamps.length > 1 ? 's' : ''} Selected`;
        }
        if (!filterType || !filterValue) return 'All Users';

        const typeLabels: { [key: string]: string } = {
            state: 'State',
            city: 'City',
            center: 'Center',
            camp_dys: 'DYS Camp',
            camp_sankalpa: 'Sankalpa Camp',
            camp_sphurti: 'Sphurti Camp',
            camp_utkarsh: 'Utkarsh Camp',
            camp_faith_and_doubt: 'Faith & Doubt Camp',
            camp_srcgd_workshop: 'SRCGD Workshop',
            camp_nistha: 'Nistha Camp',
            camp_ashray: 'Ashray Camp',
        };

        let displayValue = filterValue;
        if (filterType === 'center' && isRestrictedRole4) {
            // Value is now the Label (Name) itself, so we can just use it. 
            // Or if we need strict matching:
            // const centerObj = approvedCentersList.find(c => c.label === filterValue);
            // But displayValue = filterValue is actually correct if filterValue IS the name.
            displayValue = filterValue;
        }

        return `${typeLabels[filterType]}: ${filterValue === 'true' ? 'Completed' : displayValue}`;
    };

    if (!userData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 px-4">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-6 sm:p-10 text-center">
                    <div className="mb-6 sm:mb-8 relative">
                        <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                        <div className="relative animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3 sm:mb-4 text-orange-700 tracking-wide">
                        Hare Krishna
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-800 font-serif">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-4 sm:py-8 px-2 sm:px-4">
            <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="text-center mb-4 sm:mb-8">
                    <p className="text-base sm:text-lg md:text-xl font-serif text-orange-700 font-semibold mb-2">
                        Hare Krishna
                    </p>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display bg-gradient-to-r from-orange-600 via-orange-700 to-amber-600 bg-clip-text text-transparent mb-2 sm:mb-3 py-1">
                        Broadcast Message
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium">
                        Send targeted messages to your community
                    </p>
                </div>

                {/* Filter Selection Cards */}
                <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-purple-200 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                                <Users className="h-5 w-5 text-purple-600" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold text-purple-700">Target Audience</h2>
                        </div>
                        {(filterType || filterValue) && (
                            <button
                                onClick={clearFilter}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                <X className="h-4 w-4" />
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Current Filter Display */}
                    <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-700 font-medium">
                            Broadcasting to: <span className="font-bold">{getFilterDisplayText()}</span>
                        </p>
                    </div>

                    {/* Filter Category Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {/* Location Filter Card */}
                        <button
                            onClick={() => handleFilterCategorySelect(filterCategory === 'location' ? null : 'location')}
                            className={`group relative overflow-hidden rounded-xl p-6 transition-all duration-300 transform hover:scale-105 ${filterCategory === 'location'
                                ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-xl'
                                : 'bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-2 border-blue-200'
                                }`}
                        >
                            <div className="relative z-10">
                                <MapPin className={`h-8 w-8 mb-3 ${filterCategory === 'location' ? 'text-white' : 'text-blue-600'}`} />
                                <h3 className={`font-bold text-lg mb-1 ${filterCategory === 'location' ? 'text-white' : 'text-blue-900'}`}>
                                    Location
                                </h3>
                                <p className={`text-sm ${filterCategory === 'location' ? 'text-blue-50' : 'text-blue-600'}`}>
                                    Filter by State, City, or Center
                                </p>
                            </div>
                            {filterCategory === 'location' && (
                                <div className="absolute top-2 right-2">
                                    <CheckCircle2 className="h-6 w-6 text-white" />
                                </div>
                            )}
                        </button>

                        {/* Camp Filter Card */}
                        <button
                            onClick={() => handleFilterCategorySelect(filterCategory === 'camp' ? null : 'camp')}
                            className={`group relative overflow-hidden rounded-xl p-6 transition-all duration-300 transform hover:scale-105 ${filterCategory === 'camp'
                                ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-xl'
                                : 'bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 border-green-200'
                                }`}
                        >
                            <div className="relative z-10">
                                <Tent className={`h-8 w-8 mb-3 ${filterCategory === 'camp' ? 'text-white' : 'text-green-600'}`} />
                                <h3 className={`font-bold text-lg mb-1 ${filterCategory === 'camp' ? 'text-white' : 'text-green-900'}`}>
                                    Camps
                                </h3>
                                <p className={`text-sm ${filterCategory === 'camp' ? 'text-green-50' : 'text-green-600'}`}>
                                    Filter by Camp Completion
                                </p>
                            </div>
                            {filterCategory === 'camp' && (
                                <div className="absolute top-2 right-2">
                                    <CheckCircle2 className="h-6 w-6 text-white" />
                                </div>
                            )}
                        </button>

                        {/* All Users Card - Only for Super Admin or Higher Roles */}
                        {!isRestrictedRole4 && (
                            <button
                                onClick={clearFilter}
                                className={`group relative overflow-hidden rounded-xl p-6 transition-all duration-300 transform hover:scale-105 ${!filterCategory
                                    ? 'bg-gradient-to-br from-orange-500 to-amber-500 shadow-xl'
                                    : 'bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border-2 border-orange-200'
                                    }`}
                            >
                                <div className="relative z-10">
                                    <Radio className={`h-8 w-8 mb-3 ${!filterCategory ? 'text-white' : 'text-orange-600'}`} />
                                    <h3 className={`font-bold text-lg mb-1 ${!filterCategory ? 'text-white' : 'text-orange-900'}`}>
                                        All Users
                                    </h3>
                                    <p className={`text-sm ${!filterCategory ? 'text-orange-50' : 'text-orange-600'}`}>
                                        Broadcast to Everyone
                                    </p>
                                </div>
                                {!filterCategory && (
                                    <div className="absolute top-2 right-2">
                                        <CheckCircle2 className="h-6 w-6 text-white" />
                                    </div>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Filter Options Dropdown */}
                    {filterCategory === 'location' && filterOptions && (
                        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200 animate-in fade-in slide-in-from-top duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-blue-900 mb-2">Location Type</label>
                                    <select
                                        value={filterType}
                                        onChange={(e) => {
                                            setFilterType(e.target.value);
                                            setFilterValue('');
                                        }}
                                        className="w-full px-4 py-2.5 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none"
                                    >
                                        <option value="">Select type...</option>
                                        {!isRestrictedRole4 && <option value="state">State</option>}
                                        {!isRestrictedRole4 && <option value="city">City</option>}
                                        <option value="center">Center</option>
                                    </select>
                                </div>

                                {filterType && (
                                    <div>
                                        <label className="block text-sm font-semibold text-blue-900 mb-2">
                                            Select {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                                        </label>
                                        <select
                                            value={filterValue}
                                            onChange={(e) => setFilterValue(e.target.value)}
                                            className="w-full px-4 py-2.5 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none"
                                        >
                                            <option value="">Choose...</option>
                                            {filterType === 'state' && filterOptions.states.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                            {filterType === 'city' && filterOptions.cities.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                            {filterType === 'center' && (
                                                isRestrictedRole4 ? (
                                                    // For Restricted Role 4, only show approved centers with names
                                                    approvedCentersList.map(c => (
                                                        <option key={c.value} value={c.label}>{c.label}</option>
                                                    ))
                                                ) : (
                                                    // For Super Admin/Higher Roles, show all centers (backend will filter effectiveness but we show list)
                                                    filterOptions.centers.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))
                                                )
                                            )}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {filterCategory === 'camp' && filterOptions && (
                        <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200 animate-in fade-in slide-in-from-top duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-semibold text-green-900">Select Camps (Multiple)</label>
                                {selectedCamps.length > 0 && (
                                    <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                                        {selectedCamps.length} selected
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {filterOptions.camps.map((camp) => {
                                    const isSelected = selectedCamps.includes(camp.value);
                                    return (
                                        <button
                                            key={camp.value}
                                            type="button"
                                            onClick={() => toggleCamp(camp.value)}
                                            className={`px-4 py-3 rounded-lg text-left transition-all ${isSelected
                                                ? 'bg-green-600 text-white shadow-lg'
                                                : 'bg-white hover:bg-green-100 text-green-900 border border-green-300'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{camp.label}</span>
                                                {isSelected && <CheckCircle2 className="h-5 w-5" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-green-700 mt-3">
                                💡 Select multiple camps to send to users who completed any of them
                            </p>
                        </div>
                    )}
                </div>

                {/* Broadcast Form */}
                <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6 lg:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
                            <Radio className="h-6 w-6 text-orange-600" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-orange-700">Compose Message</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Subject */}
                        <div>
                            <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                                Subject *
                            </label>
                            <input
                                type="text"
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                required
                                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                                placeholder="Enter message subject"
                            />
                        </div>

                        {/* Content */}
                        <div>
                            <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
                                Message Content *
                            </label>
                            <textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                                rows={8}
                                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none resize-none"
                                placeholder="Enter your message content..."
                            />
                        </div>

                        {/* Priority and Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="priority" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Priority
                                </label>
                                <select
                                    id="priority"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as 'normal' | 'urgent')}
                                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none bg-white"
                                >
                                    <option value="normal">Normal</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    id="category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as 'spiritual' | 'administrative' | 'events')}
                                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none bg-white"
                                >
                                    <option value="spiritual">Spiritual</option>
                                    <option value="administrative">Administrative</option>
                                    <option value="events">Events</option>
                                </select>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !subject || !content}
                            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                    <span>Sending Broadcast...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="h-5 w-5" />
                                    <span>Send Broadcast Message</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
