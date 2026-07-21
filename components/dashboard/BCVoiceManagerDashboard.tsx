'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getUsersByCenterIds, updateUser } from '@/lib/supabase/users';
import { fetchSadhanaHistory } from '@/lib/api/sadhana-client';
import { getBCVoiceManagerRequestByUserId, requestAdditionalCenters } from '@/lib/supabase/bc-voice-manager-requests';
import { getCentersByLocationFromLocal, CenterData } from '@/lib/data/local-centers';
import { User } from '@/types';
import { Users, Loader2, Mail, Phone, MapPin, Building2, Plus, UserPlus, CheckCircle, X, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface DevWithProgress extends User {
    avgSoulPercent?: number;
    progressRating?: string;
    progressColor?: string;
    progressBgColor?: string;
    totalReports?: number;
    centerName?: string;
}

export default function BCVoiceManagerDashboard() {
    const { user, userData } = useAuth();
    const [devs, setDevs] = useState<DevWithProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [approvedCenters, setApprovedCenters] = useState<string[]>([]);
    const [centers, setCenters] = useState<CenterData[]>([]);
    const [selectedCenterFilter, setSelectedCenterFilter] = useState<string>('all');
    const [selectedCampFilter, setSelectedCampFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [showRequestMoreCenters, setShowRequestMoreCenters] = useState(false);
    const [selectedNewCenters, setSelectedNewCenters] = useState<string[]>([]);
    const [requestingMoreCenters, setRequestingMoreCenters] = useState(false);
    const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
    const [selectedUserForRole, setSelectedUserForRole] = useState<DevWithProgress | null>(null);
    const [assigningRole, setAssigningRole] = useState(false);
    const [showRemoveRoleModal, setShowRemoveRoleModal] = useState(false);
    const [removingRole, setRemovingRole] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const isLoadingDevsRef = useRef(false);
    const lastApprovedCentersRef = useRef<string>('');
    const hasLoadedInitialDataRef = useRef(false);
    const lastUserIdRef = useRef<string>('');
    const isLoadingInitialDataRef = useRef(false);

    // Get stable user ID string
    const userIdString = user?.id ? String(user.id) : null;

    // Load approved centers and centers list - only once per user
    useEffect(() => {
        if (!userIdString) return;

        // Skip if already loaded for this exact user
        if (hasLoadedInitialDataRef.current && lastUserIdRef.current === userIdString) {
            return;
        }

        // Skip if currently loading
        if (isLoadingInitialDataRef.current) {
            return;
        }

        // User changed, reset flags
        if (lastUserIdRef.current && lastUserIdRef.current !== userIdString) {
            hasLoadedInitialDataRef.current = false;
            lastApprovedCentersRef.current = '';
        }

        // Mark as loading and set user
        isLoadingInitialDataRef.current = true;
        lastUserIdRef.current = userIdString;

        let cancelled = false;

        const loadData = async () => {
            // Load approved centers
            try {
                const request = await getBCVoiceManagerRequestByUserId(userIdString);
                if (cancelled) return;

                if (request && request.approvedCenters && request.approvedCenters.length > 0) {
                    setApprovedCenters(request.approvedCenters);
                } else if (request && request.requestedCenters && request.requestedCenters.length > 0) {
                    setApprovedCenters(request.requestedCenters);
                } else {
                    setApprovedCenters([]);
                }
                setLoading(false);
            } catch (error) {
                if (cancelled) return;
                console.error('Error loading approved centers:', error);
                setApprovedCenters([]);
                setLoading(false);
            }

            // Load centers list
            try {
                const allCenters = await getCentersByLocationFromLocal();
                if (cancelled) return;
                setCenters(allCenters);
            } catch (error) {
                if (cancelled) return;
                console.error('Error loading centers:', error);
            }

            if (!cancelled) {
                hasLoadedInitialDataRef.current = true; // Only set after successful load
                isLoadingInitialDataRef.current = false;
            }
        };

        loadData();

        return () => {
            cancelled = true;
            isLoadingInitialDataRef.current = false;
        };
    }, [userIdString]); // Use stable string version of user ID

    // Load devs when approved centers or centers list changes
    useEffect(() => {
        const approvedCentersKey = approvedCenters.join(',');

        // Skip if already loading or if approved centers haven't changed
        if (isLoadingDevsRef.current || lastApprovedCentersRef.current === approvedCentersKey) {
            return;
        }

        if (approvedCenters.length > 0 && centers.length > 0) {
            isLoadingDevsRef.current = true;
            lastApprovedCentersRef.current = approvedCentersKey;
            loadDevs().finally(() => {
                isLoadingDevsRef.current = false;
            });
        } else if (approvedCenters.length === 0 && !loading) {
            setDevs([]);
            setLoading(false);
            lastApprovedCentersRef.current = '';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [approvedCenters.join(','), centers.length, selectedCenterFilter]); // Use join to create stable dependency

    const loadApprovedCenters = useCallback(async () => {
        if (!user) return;

        try {
            const request = await getBCVoiceManagerRequestByUserId(user.id);
            console.log('BC Voice Manager request data:', request);

            if (request && request.approvedCenters && request.approvedCenters.length > 0) {
                console.log('Approved centers found:', request.approvedCenters);
                // Only update if the values actually changed
                setApprovedCenters(prev => {
                    const newKey = request.approvedCenters!.join(',');
                    const prevKey = prev.join(',');
                    if (newKey !== prevKey) {
                        return request.approvedCenters!;
                    }
                    return prev;
                });
            } else if (request && request.requestedCenters && request.requestedCenters.length > 0) {
                console.log('Using requested centers as fallback:', request.requestedCenters);
                setApprovedCenters(prev => {
                    const newKey = request.requestedCenters!.join(',');
                    const prevKey = prev.join(',');
                    if (newKey !== prevKey) {
                        return request.requestedCenters!;
                    }
                    return prev;
                });
            } else {
                setApprovedCenters(prev => prev.length === 0 ? prev : []);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error loading approved centers:', error);
            setApprovedCenters([]);
            setLoading(false);
        }
    }, [user]);

    const loadCenters = useCallback(async () => {
        try {
            const allCenters = await getCentersByLocationFromLocal();
            // Only update if centers actually changed
            setCenters(prev => {
                if (prev.length === allCenters.length &&
                    prev.every((p, i) => p.id === allCenters[i]?.id && p.name === allCenters[i]?.name)) {
                    return prev; // No change, return previous value
                }
                return allCenters;
            });
        } catch (error) {
            console.error('Error loading centers:', error);
        }
    }, []);

    const approvedCentersKey = approvedCenters.join(',');
    const loadDevs = useCallback(async () => {
        if (approvedCenters.length === 0 || centers.length === 0) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Direct query by center_id - use current approvedCenters from closure
            const currentApprovedCenters = approvedCenters;
            const users = await getUsersByCenterIds(currentApprovedCenters);

            // Filter to students only
            const students = users.filter((user: User) => {
                const roles = Array.isArray(user.role) ? user.role : [user.role];
                return roles.includes('student') || roles.includes(1);
            });

            // Map center names for display
            const centerIdToNameMap = new Map<string, string>();
            for (const center of centers) {
                if (center.id) {
                    centerIdToNameMap.set(center.id, center.name);
                }
            }

            const uniqueDevs = students.map((dev: User) => {
                const devCenterId = dev.hierarchy?.centerId || '';
                const matchedCenterName = centerIdToNameMap.get(devCenterId) || dev.hierarchy?.center || '';

                return {
                    ...dev,
                    centerName: matchedCenterName,
                };
            });

            const devsWithProgress = await Promise.all(
                uniqueDevs.map(async (dev: any) => {
                    try {
                        const reports = await fetchSadhanaHistory(30, dev.id);

                        if (reports.length === 0) {
                            return {
                                ...dev,
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
                            ...dev,
                            avgSoulPercent: avgSoulPercentNum,
                            progressRating,
                            progressColor,
                            progressBgColor,
                            totalReports: reports.length,
                        };
                    } catch (error) {
                        console.error(`Error loading progress for dev ${dev.id}:`, error);
                        return {
                            ...dev,
                            avgSoulPercent: 0,
                            progressRating: 'N/A',
                            progressColor: 'text-gray-600',
                            progressBgColor: 'bg-gray-100',
                            totalReports: 0,
                        };
                    }
                })
            );
            setDevs(devsWithProgress);
        } catch (error) {
            console.error('Error loading devs:', error);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [approvedCentersKey, centers.length]); // Use extracted stable dependency

    const filteredDevs = devs.filter(dev => {
        const matchesSearch =
            dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            dev.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (dev.phone && dev.phone.includes(searchTerm));

        const matchesCenter = selectedCenterFilter === 'all' || dev.centerName === selectedCenterFilter;

        // Camp filter logic
        let matchesCamp = true;
        if (selectedCampFilter !== 'all') {
            switch (selectedCampFilter) {
                case 'DYS':
                    matchesCamp = dev.campDys === true;
                    break;
                case 'Sankalpa':
                    matchesCamp = dev.campSankalpa === true;
                    break;
                case 'Sphurti':
                    matchesCamp = dev.campSphurti === true;
                    break;
                case 'Utkarsh':
                    matchesCamp = dev.campUtkarsh === true;
                    break;
                case 'SRCGD Workshop':
                    matchesCamp = dev.campSrcgdWorkshop === true;
                    break;
                case 'Nishtha':
                    matchesCamp = dev.campNishtha === true;
                    break;
                case 'FTEC':
                    matchesCamp = dev.campFtec === true;
                    break;
                case 'Ashraya':
                    matchesCamp = dev.campAshraya === true;
                    break;
                case 'MTEC':
                    matchesCamp = dev.campMtec === true;
                    break;
                case 'Sharanagati':
                    matchesCamp = dev.campSharanagati === true;
                    break;
                case 'IDC':
                    matchesCamp = dev.campIdc === true;
                    break;
                default:
                    matchesCamp = true;
            }
        }

        return matchesSearch && matchesCenter && matchesCamp;
    });

    const approvedCenterNames = approvedCenters.map(centerId => {
        const center = centers.find(c => c.id === centerId || c.name === centerId);
        return center?.name || centerId;
    });

    // Calculate counts per center (before search/camp filtering)
    const centerCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        devs.forEach(dev => {
            const centerName = dev.centerName || 'Unknown';
            counts[centerName] = (counts[centerName] || 0) + 1;
        });
        return counts;
    }, [devs]);

    // Calculate counts per center for filtered devs (after search/camp filtering)
    const filteredCenterCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredDevs.forEach(dev => {
            const centerName = dev.centerName || 'Unknown';
            counts[centerName] = (counts[centerName] || 0) + 1;
        });
        return counts;
    }, [filteredDevs]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredDevs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedDevs = filteredDevs.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCenterFilter, selectedCampFilter]);

    const handleRequestMoreCenters = async () => {
        if (!user || selectedNewCenters.length === 0) return;

        setRequestingMoreCenters(true);
        try {
            await requestAdditionalCenters(user.id, selectedNewCenters);
            setToast({ message: `Successfully requested ${selectedNewCenters.length} additional center(s)! The super admin will review your request.`, type: 'success' });
            setTimeout(() => setToast(null), 4000);
            setShowRequestMoreCenters(false);
            setSelectedNewCenters([]);
        } catch (error: any) {
            setToast({ message: error.message || 'Failed to request additional centers', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setRequestingMoreCenters(false);
        }
    };

    // Get available centers that are not already approved
    const availableCentersForRequest = centers.filter(
        center => !approvedCenters.includes(center.id) && !approvedCenters.includes(center.name)
    );

    const handleAssignVoiceManager = async () => {
        if (!selectedUserForRole || !user) return;

        setAssigningRole(true);
        try {
            // Get current roles
            const currentRoles = Array.isArray(selectedUserForRole.role)
                ? selectedUserForRole.role
                : [selectedUserForRole.role];

            // Check if user already has voice_manager role
            if (currentRoles.includes(3) || currentRoles.includes('voice_manager') || currentRoles.includes('senior_counselor')) {
                setToast({ message: 'This user is already a Voice Manager!', type: 'error' });
                setTimeout(() => setToast(null), 3000);
                setShowAssignRoleModal(false);
                setSelectedUserForRole(null);
                return;
            }

            // Add voice_manager role (use string to avoid type issues)
            const newRoles = [...currentRoles, 'voice_manager'];

            await updateUser(selectedUserForRole.id, { role: newRoles as any });

            setToast({ message: `Successfully assigned Voice Manager role to ${selectedUserForRole.name}!`, type: 'success' });
            setTimeout(() => setToast(null), 3000);
            setShowAssignRoleModal(false);
            setSelectedUserForRole(null);

            // Reload devs to reflect changes
            await loadDevs();
        } catch (error: any) {
            console.error('Error assigning role:', error);
            setToast({ message: error.message || 'Failed to assign Voice Manager role', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setAssigningRole(false);
        }
    };

    const handleRemoveVoiceManager = async () => {
        if (!selectedUserForRole || !user) return;

        setRemovingRole(true);
        try {
            // Get current roles
            const currentRoles = Array.isArray(selectedUserForRole.role)
                ? selectedUserForRole.role
                : [selectedUserForRole.role];

            // Filter out voice manager roles (3, 'voice_manager', 'senior_counselor')
            const newRoles = currentRoles.filter(role =>
                role !== 3 && role !== 'voice_manager' && role !== 'senior_counselor'
            );

            // If no roles left, default to student (1) to prevent roleless user
            if (newRoles.length === 0) {
                newRoles.push('student');
            }

            await updateUser(selectedUserForRole.id, { role: newRoles as any });

            setToast({ message: `Successfully removed Voice Manager role from ${selectedUserForRole.name}!`, type: 'success' });
            setTimeout(() => setToast(null), 3000);
            setShowRemoveRoleModal(false);
            setSelectedUserForRole(null);

            // Reload devs to reflect changes
            await loadDevs();
        } catch (error: any) {
            console.error('Error removing role:', error);
            setToast({ message: error.message || 'Failed to remove Voice Manager role', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setRemovingRole(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-4 sm:py-8 px-2 sm:px-4">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                <div className="text-center mb-4 sm:mb-8">
                    <p className="text-base sm:text-lg md:text-xl font-serif text-orange-700 font-semibold mb-2">
                        BC Voice Manager Dashboard
                    </p>
                    <p className="text-sm sm:text-base text-orange-600">
                        Manage devs from your approved centers
                    </p>
                </div>

                {loading ? (
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6 border border-orange-200">
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
                            <p className="text-gray-600">Loading approved centers...</p>
                        </div>
                    </div>
                ) : approvedCenters.length > 0 ? (
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6 border border-orange-200">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                                <h3 className="text-sm sm:text-base font-semibold text-gray-800">Your Approved Centers ({approvedCenters.length})</h3>
                            </div>
                            <button
                                onClick={() => setShowRequestMoreCenters(true)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                            >
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden xs:inline">Request More</span>
                                <span className="xs:hidden">+ Centers</span>
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {approvedCenterNames.map((centerName, index) => {
                                const count = centerCounts[centerName] || 0;
                                return (
                                    <span
                                        key={index}
                                        className="px-2 sm:px-3 py-0.5 sm:py-1 bg-orange-100 text-orange-800 rounded-full text-xs sm:text-sm font-medium"
                                    >
                                        {centerName} ({count})
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                        <p className="text-yellow-800">
                            No approved centers assigned yet. Please contact super admin to assign centers to your BC Voice Manager role.
                        </p>
                    </div>
                )}

                {devs.length > 0 && (
                    <>
                        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6 border border-orange-200">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, or phone..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>
                                {approvedCenterNames.length > 1 && (
                                    <div className="sm:w-48">
                                        <select
                                            value={selectedCenterFilter}
                                            onChange={(e) => setSelectedCenterFilter(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        >
                                            <option value="all">
                                                All Centers ({filteredDevs.length})
                                            </option>
                                            {approvedCenterNames.map((centerName, index) => {
                                                const count = filteredCenterCounts[centerName] || 0;
                                                return (
                                                    <option key={index} value={centerName}>
                                                        {centerName} ({count})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                )}
                                <div className="sm:w-48">
                                    <select
                                        value={selectedCampFilter}
                                        onChange={(e) => setSelectedCampFilter(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    >
                                        <option value="all">All Camps</option>
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

                        {/* Filter Summary - Show when camp or center filter is active */}
                        {(selectedCampFilter !== 'all' || selectedCenterFilter !== 'all' || searchTerm) && (
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
                                            {filteredDevs.length}
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

                                    {/* Center-wise breakdown */}
                                    {Object.keys(filteredCenterCounts).length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-sm font-medium text-blue-700 mb-2">Breakdown by Center:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {approvedCenterNames
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
                    </>
                )}

                {loading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                    </div>
                ) : filteredDevs.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-8 text-center border border-orange-200">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">
                            {approvedCenters.length === 0
                                ? 'No approved centers assigned yet.'
                                : searchTerm || selectedCenterFilter !== 'all' || selectedCampFilter !== 'all'
                                    ? 'No devs found matching your filters.'
                                    : 'No devs (students) found in your approved centers.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {paginatedDevs.map((dev) => (
                                <div
                                    key={dev.id}
                                    className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6 border border-orange-200 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 break-words">{dev.name}</h3>
                                            {dev.centerName && (
                                                <p className="text-xs text-gray-500 mb-2">
                                                    <Building2 className="h-3 w-3 inline mr-1" />
                                                    {dev.centerName}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                                            <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                            <span className="truncate">{dev.email}</span>
                                        </div>
                                        {dev.phone && (
                                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                                                <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                                <span>{dev.phone}</span>
                                            </div>
                                        )}
                                        {dev.hierarchy?.city && (
                                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                                                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                                <span className="truncate">{dev.hierarchy.city}, {dev.hierarchy.state}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-gray-700">Spiritual Progress</span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${dev.progressBgColor} ${dev.progressColor}`}>
                                                {dev.progressRating}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all ${(dev.avgSoulPercent || 0) >= 80
                                                    ? 'bg-green-500'
                                                    : (dev.avgSoulPercent || 0) >= 50
                                                        ? 'bg-blue-500'
                                                        : (dev.avgSoulPercent || 0) > 0
                                                            ? 'bg-orange-500'
                                                            : 'bg-gray-400'
                                                    }`}
                                                style={{ width: `${Math.min(dev.avgSoulPercent || 0, 100)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>Soul Progress: {dev.avgSoulPercent?.toFixed(1) || 0}%</span>
                                            <span>{dev.totalReports || 0} reports (30 days)</span>
                                        </div>
                                    </div>


                                    {/* View Progress Report Button */}
                                    <Link
                                        href={`/dashboard/sadhana/progress/${dev.id}`}
                                        className="w-full px-3 sm:px-4 py-2 mb-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
                                    >
                                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                                        View Progress Report
                                    </Link>

                                    {/* Assign Voice Manager Button */}
                                    {(() => {
                                        const userRoles = Array.isArray(dev.role) ? dev.role : [dev.role];
                                        const hasVoiceManagerRole = userRoles.includes(3) || userRoles.includes('voice_manager') || userRoles.includes('senior_counselor');

                                        return (
                                            <button
                                                onClick={() => {
                                                    setSelectedUserForRole(dev);
                                                    if (hasVoiceManagerRole) {
                                                        setShowRemoveRoleModal(true);
                                                    } else {
                                                        setShowAssignRoleModal(true);
                                                    }
                                                }}
                                                className={`w-full px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium ${hasVoiceManagerRole
                                                    ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700 hover:border-red-300 border-2 border-green-300'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    }`}
                                            >
                                                {hasVoiceManagerRole ? (
                                                    <>
                                                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                                        <span className="group-hover:hidden">Voice Manager Assigned</span>
                                                        <span className="hidden group-hover:inline">Remove Role</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                                                        Assign Voice Manager
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })()}
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6 border border-orange-200">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-sm text-gray-700">
                                        Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                                        <span className="font-semibold">{Math.min(endIndex, filteredDevs.length)}</span> of{' '}
                                        <span className="font-semibold">{filteredDevs.length}</span> devs
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
                    </>
                )}
            </div>

            {/* Request More Centers Modal */}
            {showRequestMoreCenters && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
                        <div className="p-4 sm:p-6">
                            <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Request Additional Centers</h2>
                            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                                Select the centers you want to request access to. The super admin will review your request.
                            </p>

                            {availableCentersForRequest.length === 0 ? (
                                <p className="text-sm sm:text-base text-gray-500 text-center py-6 sm:py-8">
                                    No additional centers available to request.
                                </p>
                            ) : (
                                <div className="space-y-2 mb-4 sm:mb-6 max-h-[50vh] sm:max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-2 sm:p-4">
                                    {availableCentersForRequest.map((center) => (
                                        <label
                                            key={center.id}
                                            className="flex items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedNewCenters.includes(center.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedNewCenters([...selectedNewCenters, center.id]);
                                                    } else {
                                                        setSelectedNewCenters(selectedNewCenters.filter(id => id !== center.id));
                                                    }
                                                }}
                                                className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mt-0.5 sm:mt-0 flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm sm:text-base font-medium text-gray-800 break-words">{center.name}</p>
                                                <p className="text-xs sm:text-sm text-gray-500 truncate">{center.city}, {center.state}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                <button
                                    onClick={() => {
                                        setShowRequestMoreCenters(false);
                                        setSelectedNewCenters([]);
                                    }}
                                    className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base order-2 sm:order-1"
                                    disabled={requestingMoreCenters}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRequestMoreCenters}
                                    disabled={selectedNewCenters.length === 0 || requestingMoreCenters}
                                    className="flex-1 px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base order-1 sm:order-2"
                                >
                                    {requestingMoreCenters ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="hidden xs:inline">Requesting...</span>
                                            <span className="xs:hidden">...</span>
                                        </>
                                    ) : (
                                        <>
                                            Request {selectedNewCenters.length > 0 && `(${selectedNewCenters.length})`}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Voice Manager Modal */}
            {showAssignRoleModal && selectedUserForRole && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Assign Voice Manager Role</h2>
                            <p className="text-sm sm:text-base text-gray-600 mb-4">
                                Are you sure you want to assign <strong className="text-gray-800">{selectedUserForRole.name}</strong> as a Voice Manager?
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <p className="text-xs sm:text-sm text-blue-800">
                                    <strong>Note:</strong> Voice Managers can view and manage students from their assigned center: <strong>{selectedUserForRole.hierarchy?.center || 'their center'}</strong>
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                <button
                                    onClick={() => {
                                        setShowAssignRoleModal(false);
                                        setSelectedUserForRole(null);
                                    }}
                                    className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base order-2 sm:order-1"
                                    disabled={assigningRole}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssignVoiceManager}
                                    disabled={assigningRole}
                                    className="flex-1 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base order-1 sm:order-2"
                                >
                                    {assigningRole ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="hidden xs:inline">Assigning...</span>
                                            <span className="xs:hidden">...</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="h-4 w-4" />
                                            Assign Role
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Voice Manager Modal */}
            {showRemoveRoleModal && selectedUserForRole && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-bold text-red-800 mb-3 sm:mb-4">Remove Voice Manager Role</h2>
                            <p className="text-sm sm:text-base text-gray-600 mb-4">
                                Are you sure you want to remove the Voice Manager role from <strong className="text-gray-800">{selectedUserForRole.name}</strong>?
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                <p className="text-xs sm:text-sm text-red-800">
                                    <strong>Warning:</strong> This user will lose access to the Voice Manager dashboard and student management features immediately.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                <button
                                    onClick={() => {
                                        setShowRemoveRoleModal(false);
                                        setSelectedUserForRole(null);
                                    }}
                                    className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base order-2 sm:order-1"
                                    disabled={removingRole}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRemoveVoiceManager}
                                    disabled={removingRole}
                                    className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base order-1 sm:order-2"
                                >
                                    {removingRole ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="hidden xs:inline">Removing...</span>
                                            <span className="xs:hidden">...</span>
                                        </>
                                    ) : (
                                        <>
                                            <X className="h-4 w-4" />
                                            Remove Role
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 animate-slideInRight">
                    <div className={`flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-2xl border-2 ${toast.type === 'success'
                        ? 'bg-green-50 border-green-300 text-green-800'
                        : 'bg-red-50 border-red-300 text-red-800'
                        }`}>
                        {toast.type === 'success' ? (
                            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                        ) : (
                            <X className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                        )}
                        <p className="text-sm sm:text-base font-medium">{toast.message}</p>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 hover:opacity-70 transition-opacity"
                        >
                            <X className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
