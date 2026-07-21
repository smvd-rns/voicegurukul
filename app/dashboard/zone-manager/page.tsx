'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { getUsersByZone } from '@/lib/supabase/users';
import { fetchSadhanaHistory } from '@/lib/api/sadhana-client';
import { User } from '@/types';
import { Users, Loader2, Mail, Phone, MapPin, Building2, UserCircle, TrendingUp, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { getRoleDisplayName, getUserMaxRoleLevel } from '@/lib/utils/roles';

interface UserWithProgress extends User {
    avgSoulPercent?: number;
    progressRating?: string;
    progressColor?: string;
    progressBgColor?: string;
    totalReports?: number;
}

export default function ZoneManagerPage() {
    const { user, userData } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserWithProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStateFilter, setSelectedStateFilter] = useState<string>('all');
    const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
    const [selectedCenterFilter, setSelectedCenterFilter] = useState<string>('all');
    const [selectedCampFilter, setSelectedCampFilter] = useState<string>('all');
    const [statesInZone, setStatesInZone] = useState<string[]>([]);
    const [citiesInSelectedState, setCitiesInSelectedState] = useState<string[]>([]);
    const [centersInSelectedCity, setCentersInSelectedCity] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Check if user has zonal_admin role (role 7)
    const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
    const hasZonalAdminRole = userRoles.includes('zonal_admin') || userRoles.includes(7);

    const loadUsers = useCallback(async () => {
        const assignedZone = userData?.hierarchy?.assignedZone;

        if (!assignedZone) {
            console.log('Zone Manager: No assigned zone found. Please contact admin to assign a zone.', userData?.hierarchy);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            console.log('Zone Manager: Loading users for zone:', assignedZone);

            // Get all users from the zone
            const zoneUsers = await getUsersByZone(assignedZone);
            console.log('Zone Manager: Found users:', zoneUsers.length);

            // Get all unique states in this zone
            const uniqueStates = [...new Set(zoneUsers.map((u: any) => u.hierarchy?.state).filter(Boolean))] as string[];
            setStatesInZone(uniqueStates.sort());

            // Filter out users with higher role than current user
            const currentUserRoleNum = getUserMaxRoleLevel(userData.role);
            const visibleUsers = zoneUsers.filter((u: any) => {
                const targetUserRoleNum = getUserMaxRoleLevel(u.role);
                return targetUserRoleNum <= currentUserRoleNum;
            });
            console.log(`Zone Manager: Filtered ${zoneUsers.length} users to ${visibleUsers.length} visible users (role <= ${currentUserRoleNum})`);

            // Fetch spiritual progress for students only
            const students = visibleUsers.filter((user: any) => {
                const roles = Array.isArray(user.role) ? user.role : [user.role];
                return roles.includes('student') || roles.includes(1);
            });

            const usersWithProgress = await Promise.all(
                students.map(async (user: any) => {
                    try {
                        const reports = await fetchSadhanaHistory(30, user.id);

                        if (reports.length === 0) {
                            return {
                                ...user,
                                avgSoulPercent: 0,
                                progressRating: 'No Reports',
                                progressColor: 'text-gray-600',
                                progressBgColor: 'bg-gray-100',
                                totalReports: 0,
                            };
                        }

                        const avgSoulPercent = reports.reduce((sum, r) => sum + (r.soulPercent || 0), 0) / reports.length;
                        const avgSoulPercentNum = parseFloat(avgSoulPercent.toFixed(1));

                        let progressRating = '';
                        let progressColor = '';
                        let progressBgColor = '';

                        if (avgSoulPercentNum >= 80) {
                            progressRating = 'Excellent';
                            progressColor = 'text-green-600';
                            progressBgColor = 'bg-green-100';
                        } else if (avgSoulPercentNum >= 50) {
                            progressRating = 'Good Progress';
                            progressColor = 'text-blue-600';
                            progressBgColor = 'bg-blue-100';
                        } else if (avgSoulPercentNum > 0) {
                            progressRating = 'Needs Improvement';
                            progressColor = 'text-orange-600';
                            progressBgColor = 'bg-orange-100';
                        } else {
                            progressRating = 'No Progress';
                            progressColor = 'text-gray-600';
                            progressBgColor = 'bg-gray-100';
                        }

                        return {
                            ...user,
                            avgSoulPercent: avgSoulPercentNum,
                            progressRating,
                            progressColor,
                            progressBgColor,
                            totalReports: reports.length,
                        };
                    } catch (error) {
                        console.error(`Error loading progress for user ${user.id}:`, error);
                        return {
                            ...user,
                            avgSoulPercent: 0,
                            progressRating: 'N/A',
                            progressColor: 'text-gray-600',
                            progressBgColor: 'bg-gray-100',
                            totalReports: 0,
                        };
                    }
                })
            );

            // Add non-student users without progress data
            const otherUsers = visibleUsers.filter((user: any) => {
                const roles = Array.isArray(user.role) ? user.role : [user.role];
                return !(roles.includes('student') || roles.includes(1));
            });

            const allUsers = [
                ...usersWithProgress,
                ...otherUsers.map((user: any) => ({
                    ...user,
                    avgSoulPercent: undefined,
                    progressRating: undefined,
                    progressColor: undefined,
                    progressBgColor: undefined,
                    totalReports: undefined,
                }))
            ];

            setUsers(allUsers);
        } catch (error) {
            console.error('Error loading users:', error);
            alert('Error loading users. Please check console for details.');
        } finally {
            setLoading(false);
        }
    }, [userData]);

    useEffect(() => {
        if (!userData) return;

        // Check if user has zonal_admin role
        if (!hasZonalAdminRole) {
            router.push('/dashboard');
            return;
        }

        loadUsers();
    }, [userData, hasZonalAdminRole, router, loadUsers]);

    // Update cities when state filter changes
    useEffect(() => {
        if (selectedStateFilter === 'all') {
            setCitiesInSelectedState([]);
            setSelectedCityFilter('all');
            setCentersInSelectedCity([]);
            setSelectedCenterFilter('all');
        } else {
            const cities = [...new Set(
                users
                    .filter(u => u.hierarchy?.state === selectedStateFilter)
                    .map(u => u.hierarchy?.city)
                    .filter(Boolean)
            )] as string[];
            setCitiesInSelectedState(cities.sort());
            setSelectedCityFilter('all');
            setCentersInSelectedCity([]);
            setSelectedCenterFilter('all');
        }
    }, [selectedStateFilter, users]);

    // Update centers when city filter changes
    useEffect(() => {
        if (selectedCityFilter === 'all') {
            setCentersInSelectedCity([]);
            setSelectedCenterFilter('all');
        } else {
            const centers = [...new Set(
                users
                    .filter(u => u.hierarchy?.city === selectedCityFilter)
                    .map(u => u.hierarchy?.center)
                    .filter(Boolean)
            )] as string[];
            setCentersInSelectedCity(centers.sort());
            setSelectedCenterFilter('all');
        }
    }, [selectedCityFilter, users]);

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch =
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.phone && user.phone.includes(searchTerm));

            const matchesState = selectedStateFilter === 'all' || user.hierarchy?.state === selectedStateFilter;
            const matchesCity = selectedCityFilter === 'all' || user.hierarchy?.city === selectedCityFilter;
            const matchesCenter = selectedCenterFilter === 'all' || user.hierarchy?.center === selectedCenterFilter;

            // Camp filter logic
            let matchesCamp = true;
            if (selectedCampFilter !== 'all') {
                switch (selectedCampFilter) {
                    case 'DYS':
                        matchesCamp = user.campDys === true;
                        break;
                    case 'Sankalpa':
                        matchesCamp = user.campSankalpa === true;
                        break;
                    case 'Sphurti':
                        matchesCamp = user.campSphurti === true;
                        break;
                    case 'Utkarsh':
                        matchesCamp = user.campUtkarsh === true;
                        break;
                    case 'SRCGD Workshop':
                        matchesCamp = user.campSrcgdWorkshop === true;
                        break;
                    case 'Nishtha':
                        matchesCamp = user.campNishtha === true;
                        break;
                    case 'FTEC':
                        matchesCamp = user.campFtec === true;
                        break;
                    case 'Ashraya':
                        matchesCamp = user.campAshraya === true;
                        break;
                    case 'MTEC':
                        matchesCamp = user.campMtec === true;
                        break;
                    case 'Sharanagati':
                        matchesCamp = user.campSharanagati === true;
                        break;
                    case 'IDC':
                        matchesCamp = user.campIdc === true;
                        break;
                    default:
                        matchesCamp = true;
                }
            }

            return matchesSearch && matchesState && matchesCity && matchesCenter && matchesCamp;
        });
    }, [users, searchTerm, selectedStateFilter, selectedCityFilter, selectedCenterFilter, selectedCampFilter]);

    // Calculate counts per state (before search/camp filtering)
    const stateCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        users.forEach(user => {
            const stateName = user.hierarchy?.state || 'Unknown';
            counts[stateName] = (counts[stateName] || 0) + 1;
        });
        return counts;
    }, [users]);

    // Calculate counts per state for filtered users (after search/camp filtering)
    const filteredStateCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredUsers.forEach(user => {
            const stateName = user.hierarchy?.state || 'Unknown';
            counts[stateName] = (counts[stateName] || 0) + 1;
        });
        return counts;
    }, [filteredUsers]);

    // Calculate counts per city for filtered users (after search/camp filtering)
    const filteredCityCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredUsers.forEach(user => {
            const cityName = user.hierarchy?.city || 'Unknown';
            counts[cityName] = (counts[cityName] || 0) + 1;
        });
        return counts;
    }, [filteredUsers]);

    // Calculate counts per center for filtered users (after search/camp filtering)
    const filteredCenterCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredUsers.forEach(user => {
            const centerName = user.hierarchy?.center || 'Unknown';
            counts[centerName] = (counts[centerName] || 0) + 1;
        });
        return counts;
    }, [filteredUsers]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedStateFilter, selectedCityFilter, selectedCenterFilter, selectedCampFilter]);

    // Calculate state-wise statistics
    const stateStats = statesInZone.map(state => {
        const stateUsers = users.filter(u => u.hierarchy?.state === state);
        const cities = [...new Set(stateUsers.map(u => u.hierarchy?.city).filter(Boolean))];
        return {
            state,
            count: stateUsers.length,
            cities: cities.length,
        };
    });

    if (!hasZonalAdminRole) {
        return null;
    }

    const assignedZone = userData?.hierarchy?.assignedZone;

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-4 sm:py-8 px-2 sm:px-4">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="text-center mb-4 sm:mb-8">
                    <p className="text-base sm:text-lg md:text-xl font-serif text-orange-700 font-semibold mb-2">
                        Hare Krishna
                    </p>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display bg-gradient-to-r from-orange-600 via-orange-700 to-amber-600 bg-clip-text text-transparent mb-2 sm:mb-3 py-1">
                        Zone Manager Dashboard
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium">
                        Managing users from zone: {assignedZone}
                    </p>
                    {statesInZone.length > 0 && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            {statesInZone.length} state{statesInZone.length !== 1 ? 's' : ''} in this zone
                        </p>
                    )}
                </div>

                {/* State Statistics */}
                {stateStats.length > 0 && !loading && (
                    <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3">Users by State</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {stateStats.map(({ state, count, cities }) => (
                                <div key={state} className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                    <p className="text-xs sm:text-sm font-semibold text-gray-700 truncate" title={state}>{state}</p>
                                    <p className="text-lg sm:text-xl font-bold text-orange-600">{count} users</p>
                                    <p className="text-xs text-gray-600">{cities} {cities !== 1 ? 'cities' : 'city'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search and Filter Bar */}
                <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 px-4 py-2 sm:py-3 border-2 border-orange-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base bg-white w-full"
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-3">
                            {statesInZone.length > 0 && (
                                <select
                                    value={selectedStateFilter}
                                    onChange={(e) => setSelectedStateFilter(e.target.value)}
                                    className="px-1 sm:px-4 py-2 sm:py-3 border-2 border-orange-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-[10px] sm:text-base bg-white w-full min-w-0 sm:w-auto"
                                >
                                    <option value="all">
                                        States ({filteredUsers.length})
                                    </option>
                                    {statesInZone.map((state, index) => {
                                        const count = filteredStateCounts[state] || 0;
                                        return (
                                            <option key={index} value={state}>
                                                {state} ({count})
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                            {citiesInSelectedState.length > 0 && (
                                <select
                                    value={selectedCityFilter}
                                    onChange={(e) => setSelectedCityFilter(e.target.value)}
                                    className="px-1 sm:px-4 py-2 sm:py-3 border-2 border-orange-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-[10px] sm:text-base bg-white w-full min-w-0 sm:w-auto"
                                >
                                    <option value="all">
                                        Cities ({filteredUsers.length})
                                    </option>
                                    {citiesInSelectedState.map((city, index) => {
                                        const count = filteredCityCounts[city] || 0;
                                        return (
                                            <option key={index} value={city}>
                                                {city} ({count})
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                            {centersInSelectedCity.length > 0 && (
                                <select
                                    value={selectedCenterFilter}
                                    onChange={(e) => setSelectedCenterFilter(e.target.value)}
                                    className="px-1 sm:px-4 py-2 sm:py-3 border-2 border-orange-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-[10px] sm:text-base bg-white w-full min-w-0 sm:w-auto"
                                >
                                    <option value="all">
                                        Centers ({filteredUsers.length})
                                    </option>
                                    {centersInSelectedCity.map((center, index) => {
                                        const count = filteredCenterCounts[center] || 0;
                                        return (
                                            <option key={index} value={center}>
                                                {center} ({count})
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                            <select
                                value={selectedCampFilter}
                                onChange={(e) => setSelectedCampFilter(e.target.value)}
                                className="px-1 sm:px-4 py-2 sm:py-3 border-2 border-orange-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-[10px] sm:text-base bg-white w-full min-w-0 sm:w-auto"
                            >
                                <option value="all">Camps</option>
                                <option value="DYS">DYS</option>
                                <option value="Sankalpa">Sankalpa</option>
                                <option value="Sphurti">Sphurti</option>
                                <option value="Utkarsh">Utkarsh</option>
                                <option value="SRCGD Workshop">SRCGD Workshop</option>
                                <option value="Nishtha">Nishtha</option>
                                <option value="FTEC">FTEC</option>
                                <option value="Ashraya">Ashraya</option>
                                <option value="MTEC">MTEC</option>
                                <option value="Sharanagati">Sharanagati</option>
                                <option value="IDC">IDC</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Filter Summary - Show when camp, state, city, or center filter is active */}
                {(selectedCampFilter !== 'all' || selectedStateFilter !== 'all' || selectedCityFilter !== 'all' || selectedCenterFilter !== 'all' || searchTerm) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-md p-4 sm:p-6">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                <h3 className="text-base sm:text-lg font-semibold text-blue-800">
                                    Filter Summary
                                </h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                                <span className="font-medium text-blue-700">
                                    Total Matching Profiles:
                                </span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                                    {filteredUsers.length}
                                </span>
                            </div>

                            {selectedCampFilter !== 'all' && (
                                <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                                    <span className="font-medium text-blue-700">
                                        Selected Camp:
                                    </span>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                                        {selectedCampFilter}
                                    </span>
                                </div>
                            )}

                            {/* State-wise breakdown */}
                            {Object.keys(filteredStateCounts).length > 0 && statesInZone.length > 1 && (
                                <div className="mt-2">
                                    <p className="text-sm font-medium text-blue-700 mb-2">Breakdown by State:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {statesInZone
                                            .filter(stateName => (filteredStateCounts[stateName] || 0) > 0)
                                            .map((stateName, index) => (
                                                <span
                                                    key={index}
                                                    className="px-3 py-1 bg-white border border-blue-300 text-blue-800 rounded-lg text-sm font-medium"
                                                >
                                                    {stateName}: <span className="font-bold">{filteredStateCounts[stateName] || 0}</span>
                                                </span>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* City-wise breakdown */}
                            {Object.keys(filteredCityCounts).length > 0 && citiesInSelectedState.length > 1 && (
                                <div className="mt-2">
                                    <p className="text-sm font-medium text-blue-700 mb-2">Breakdown by City:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {citiesInSelectedState
                                            .filter(cityName => (filteredCityCounts[cityName] || 0) > 0)
                                            .map((cityName, index) => (
                                                <span
                                                    key={index}
                                                    className="px-3 py-1 bg-white border border-blue-300 text-blue-800 rounded-lg text-sm font-medium"
                                                >
                                                    {cityName}: <span className="font-bold">{filteredCityCounts[cityName] || 0}</span>
                                                </span>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Center-wise breakdown */}
                            {Object.keys(filteredCenterCounts).length > 0 && centersInSelectedCity.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-sm font-medium text-blue-700 mb-2">Breakdown by Center:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {centersInSelectedCity
                                            .filter(centerName => (filteredCenterCounts[centerName] || 0) > 0)
                                            .map((centerName, index) => (
                                                <span
                                                    key={index}
                                                    className="px-3 py-1 bg-white border border-blue-300 text-blue-800 rounded-lg text-sm font-medium"
                                                >
                                                    {centerName}: <span className="font-bold">{filteredCenterCounts[centerName] || 0}</span>
                                                </span>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="min-h-screen flex items-center justify-center">
                        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-10 text-center transform transition-all">
                            <div className="mb-8 relative">
                                <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                <div className="relative animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
                            </div>
                            <h2 className="text-3xl font-display font-bold mb-4 text-orange-700 tracking-wide">
                                Hare Krishna
                            </h2>
                            <div className="space-y-2">
                                <p className="text-xl text-gray-800 font-serif">
                                    Loading users...
                                </p>
                            </div>
                        </div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-8 sm:p-12 text-center">
                        <UserCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 text-sm sm:text-base">
                            {searchTerm || selectedStateFilter !== 'all' || selectedCityFilter !== 'all' || selectedCenterFilter !== 'all' || selectedCampFilter !== 'all'
                                ? 'No users found matching your filters'
                                : 'No users found in your assigned zone'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {paginatedUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6 hover:shadow-2xl transition-all transform hover:scale-[1.02]"
                                >
                                    <div className="flex items-start gap-3 sm:gap-4 mb-4">
                                        {user.profileImage ? (
                                            <Image
                                                src={user.profileImage}
                                                alt={user.name}
                                                width={64}
                                                height={64}
                                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-orange-200"
                                                unoptimized={true}
                                            />
                                        ) : (
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                <UserCircle className="h-7 w-7 sm:h-8 sm:w-8 text-orange-600" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base sm:text-lg font-bold text-gray-800 truncate mb-1">
                                                {user.name}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-500 mb-2">
                                                {getRoleDisplayName(Array.isArray(user.role) ? user.role[0] : (user.role || 'student'))}
                                            </p>
                                            {/* Spiritual Progress Badge */}
                                            {user.avgSoulPercent !== undefined && (
                                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${user.progressBgColor} ${user.progressColor} border-2 border-orange-200`}>
                                                    <Sparkles className="h-3 w-3" />
                                                    <span>{user.progressRating}</span>
                                                    {user.avgSoulPercent > 0 && (
                                                        <span className="ml-1">({user.avgSoulPercent.toFixed(1)}%)</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Spiritual Progress Bar - Only show for students */}
                                    {user.avgSoulPercent !== undefined && user.avgSoulPercent > 0 && (
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs sm:text-sm font-semibold text-gray-700">Soul Progress</span>
                                                <span className="text-xs sm:text-sm font-bold text-orange-700">{user.avgSoulPercent.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-orange-100 rounded-full h-2 sm:h-3 overflow-hidden shadow-inner">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${user.avgSoulPercent >= 80
                                                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                                                        : user.avgSoulPercent >= 50
                                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                                            : 'bg-gradient-to-r from-orange-500 to-orange-600'
                                                        }`}
                                                    style={{ width: `${Math.min(100, Math.max(0, user.avgSoulPercent))}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2 text-xs sm:text-sm mb-4">
                                        {user.email && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                                <span className="truncate">{user.email}</span>
                                            </div>
                                        )}
                                        {user.phone && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                                <span>{user.phone}</span>
                                            </div>
                                        )}
                                        {user.hierarchy?.state && user.hierarchy?.city && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                                <span className="truncate">{user.hierarchy.city}, {user.hierarchy.state}</span>
                                            </div>
                                        )}
                                        {user.hierarchy?.center && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                                <span className="truncate">{user.hierarchy.center}</span>
                                            </div>
                                        )}
                                        {user.totalReports !== undefined && user.totalReports > 0 && (
                                            <div className="flex items-center gap-2 text-gray-600 pt-1 border-t border-gray-200">
                                                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
                                                <span className="text-xs">{user.totalReports} report{user.totalReports !== 1 ? 's' : ''} (last 30 days)</span>
                                            </div>
                                        )}
                                    </div>

                                    <Link
                                        href={`/dashboard/sadhana/progress/${user.id}`}
                                        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium text-sm sm:text-base"
                                    >
                                        <TrendingUp className="h-4 w-4" />
                                        View Progress Report
                                    </Link>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-sm text-gray-700">
                                        Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                                        <span className="font-semibold">{Math.min(endIndex, filteredUsers.length)}</span> of{' '}
                                        <span className="font-semibold">{filteredUsers.length}</span> users
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-2 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            <span className="hidden sm:inline">Previous</span>
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .filter(page => {
                                                    return (
                                                        page === 1 ||
                                                        page === totalPages ||
                                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                                    );
                                                })
                                                .map((page, index, array) => {
                                                    const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                                                    return (
                                                        <div key={page} className="flex items-center gap-1">
                                                            {showEllipsisBefore && (
                                                                <span className="px-2 text-gray-400">...</span>
                                                            )}
                                                            <button
                                                                onClick={() => setCurrentPage(page)}
                                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                                                    ? 'bg-orange-600 text-white'
                                                                    : 'border border-orange-200 hover:bg-orange-50 text-gray-700'
                                                                    }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-2 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                                        >
                                            <span className="hidden sm:inline">Next</span>
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        {!loading && users.length > 0 && (
                            <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                                    <p className="text-sm sm:text-base text-gray-700 font-semibold">
                                        <strong className="text-orange-700">Total Users:</strong> {users.length}
                                        {(searchTerm || selectedStateFilter !== 'all' || selectedCityFilter !== 'all' || selectedCenterFilter !== 'all' || selectedCampFilter !== 'all') && (
                                            <span className="ml-2 text-gray-600">
                                                (Showing {filteredUsers.length} matching result{filteredUsers.length !== 1 ? 's' : ''})
                                            </span>
                                        )}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs sm:text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            <span className="text-gray-700">Excellent (≥80%)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                            <span className="text-gray-700">Good (≥50%)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                            <span className="text-gray-700">Needs Improvement</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
