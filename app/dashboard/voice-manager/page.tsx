'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { getUsersByHierarchy } from '@/lib/supabase/users';
import { fetchSadhanaHistory } from '@/lib/api/sadhana-client';
import { User, SadhanaReport } from '@/types';
import { Users, Loader2, Mail, Phone, MapPin, Building2, UserCircle, TrendingUp, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { getRoleDisplayName, roleToNumber, getUserMaxRoleLevel } from '@/lib/utils/roles';

interface DevWithProgress extends User {
  avgSoulPercent?: number;
  progressRating?: string;
  progressColor?: string;
  progressBgColor?: string;
  totalReports?: number;
}

export default function VoiceManagerPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [devs, setDevs] = useState<DevWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampFilter, setSelectedCampFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [assignedCentersList, setAssignedCentersList] = useState<string[]>([]);

  // Check if user has voice_manager role (role 3)
  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const hasVoiceManagerRole = userRoles.includes('voice_manager') || userRoles.includes('senior_counselor') || userRoles.includes(3);

  const loadDevs = useCallback(async () => {
    if (!user || !userData) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase/config');
      if (!supabase) {
        setLoading(false);
        return;
      }

      // 1. Look up centers explicitly assigned to this manager in the database
      const { data: dbCenters } = await supabase
        .from('centers')
        .select('id, name')
        .or(`project_manager_id.eq.${user.id},project_advisor_id.eq.${user.id},acting_manager_id.eq.${user.id},oc_id.eq.${user.id},care_giver_id.eq.${user.id},youth_preacher_id.eq.${user.id},internal_manager_id.eq.${user.id},preaching_coordinator_id.eq.${user.id},morning_program_in_charge_id.eq.${user.id},accountant_id.eq.${user.id},kitchen_head_id.eq.${user.id},study_in_charge_id.eq.${user.id},event_admin_id.eq.${user.id},grihstha_counselor_id.eq.${user.id},easy_incharge_id.eq.${user.id},prerna_incharge_id.eq.${user.id}`);

      let assignedCenterIds = (dbCenters || []).map((c: any) => c.id).filter(Boolean);
      let assignedCenterNames = (dbCenters || []).map((c: any) => c.name).filter(Boolean);

      // Also check user_centers junction table
      const { data: userCenters } = await supabase
        .from('user_centers')
        .select('center_id')
        .eq('user_id', user.id);

      if (userCenters && userCenters.length > 0) {
        const ucIds = userCenters.map((uc: any) => uc.center_id).filter(Boolean);
        if (ucIds.length > 0) {
          const { data: cData } = await supabase
            .from('centers')
            .select('id, name')
            .in('id', ucIds);
          if (cData) {
            cData.forEach((c: any) => {
              if (c.id && !assignedCenterIds.includes(c.id)) assignedCenterIds.push(c.id);
              if (c.name && !assignedCenterNames.includes(c.name)) assignedCenterNames.push(c.name);
            });
          }
        }
      }

      setAssignedCentersList(assignedCenterNames);

      if (assignedCenterIds.length === 0 && assignedCenterNames.length === 0) {
        console.log('Voice Manager: No assigned centers found in database.');
        setDevs([]);
        setLoading(false);
        return;
      }

      let centerUsers: User[] = [];

      // Query users by assigned center IDs
      if (assignedCenterIds.length > 0) {
        const { getUsersByCenterIds } = await import('@/lib/supabase/users');
        centerUsers = await getUsersByCenterIds(assignedCenterIds);
      }

      // Query users by assigned center names if ID query didn't find them
      if (centerUsers.length === 0 && assignedCenterNames.length > 0) {
        for (const cName of assignedCenterNames) {
          const res = await getUsersByHierarchy({ center: cName });
          centerUsers.push(...res);
        }
      }

      // Deduplicate users
      const seenIds = new Set<string>();
      centerUsers = centerUsers.filter(u => {
        if (!u.id || seenIds.has(u.id)) return false;
        seenIds.add(u.id);
        return true;
      });

      // Filter out users with higher role than current user
      const currentUserRoleNum = Math.max(...(Array.isArray(userData.role) ? userData.role : [userData.role]).map((r: any) => roleToNumber(r)) as number[]);

      const visibleUsers = centerUsers.filter(u => {
        const targetUserRoleNum = Math.max(...(Array.isArray(u.role) ? u.role : [u.role]).map((r: any) => roleToNumber(r)) as number[]);
        return targetUserRoleNum <= currentUserRoleNum;
      });

      console.log(`Voice Manager: Filtered ${centerUsers.length} users to ${visibleUsers.length} visible users (role <= ${currentUserRoleNum})`);

      // Fetch spiritual progress for each user (filter to students for progress tracking)
      const students = visibleUsers.filter(user => {
        const roles = Array.isArray(user.role) ? user.role : [user.role];
        return roles.includes('student') || roles.includes(1);
      });

      // Fetch spiritual progress for each student
      const devsWithProgress = await Promise.all(
        students.map(async (dev) => {
          try {
            // Get last 30 days of reports for quick overview
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

      // Combine students with progress and other users (counselors, etc.) without progress
      const otherUsers = visibleUsers.filter(user => {
        const roles = Array.isArray(user.role) ? user.role : [user.role];
        return !(roles.includes('student') || roles.includes(1));
      });

      // Add other users (counselors, etc.) without progress data
      const allUsers = [
        ...devsWithProgress,
        ...otherUsers.map(user => ({
          ...user,
          avgSoulPercent: undefined,
          progressRating: undefined,
          progressColor: undefined,
          progressBgColor: undefined,
          totalReports: undefined,
        }))
      ];

      setDevs(allUsers);

      if (allUsers.length === 0) {
        console.warn('Voice Manager: No users found for assigned centers:', assignedCenterNames);
      }
    } catch (error) {
      console.error('Error loading devs:', error);
      alert('Error loading users. Please check console for details.');
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    if (!userData) return;

    // Check if user has voice_manager role
    if (!hasVoiceManagerRole) {
      router.push('/dashboard');
      return;
    }

    loadDevs();
  }, [userData, hasVoiceManagerRole, router, loadDevs]);

  const filteredDevs = useMemo(() => {
    return devs.filter(dev => {
      const matchesSearch =
        dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dev.phone && dev.phone.includes(searchTerm));

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

      return matchesSearch && matchesCamp;
    });
  }, [devs, searchTerm, selectedCampFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredDevs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDevs = filteredDevs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCampFilter]);

  if (!hasVoiceManagerRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <p className="text-base sm:text-lg md:text-xl font-serif text-orange-700 font-semibold mb-2">
            Hare Krishna
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display bg-gradient-to-r from-orange-600 via-orange-700 to-amber-600 bg-clip-text text-transparent mb-2 sm:mb-3 py-1">
            Voice Manager Dashboard
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium">
            View and manage all users from your assigned center(s): {assignedCentersList.join(', ') || 'No center assigned'}
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 w-full px-4 py-2 sm:py-3 border-2 border-orange-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base bg-white"
            />
            <div className="sm:w-48">
              <select
                value={selectedCampFilter}
                onChange={(e) => setSelectedCampFilter(e.target.value)}
                className="w-full px-4 py-2 sm:py-3 border-2 border-orange-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base bg-white"
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

        {/* Filter Summary - Show when camp filter is active */}
        {(selectedCampFilter !== 'all' || searchTerm) && (
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
                  Total Matching Users:
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
                  Loading devs...
                </p>
              </div>
            </div>
          </div>
        ) : filteredDevs.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-8 sm:p-12 text-center">
            <UserCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-sm sm:text-base">
              {searchTerm || selectedCampFilter !== 'all'
                ? 'No users found matching your filters'
                : 'No users assigned to your center yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {paginatedDevs.map((dev) => (
                <div
                  key={dev.id}
                  className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6 hover:shadow-2xl transition-all transform hover:scale-[1.02]"
                >
                  <div className="flex items-start gap-3 sm:gap-4 mb-4">
                    {dev.profileImage ? (
                      <Image
                        src={dev.profileImage}
                        alt={dev.name}
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
                        {dev.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 mb-2">
                        {getRoleDisplayName(Array.isArray(dev.role) ? dev.role[0] : (dev.role || 'student'))}
                      </p>
                      {/* Spiritual Progress Badge */}
                      {dev.avgSoulPercent !== undefined && (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${dev.progressBgColor} ${dev.progressColor} border-2 border-orange-200`}>
                          <Sparkles className="h-3 w-3" />
                          <span>{dev.progressRating}</span>
                          {dev.avgSoulPercent > 0 && (
                            <span className="ml-1">({dev.avgSoulPercent.toFixed(1)}%)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Spiritual Progress Bar - Only show for students */}
                  {dev.avgSoulPercent !== undefined && dev.avgSoulPercent > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs sm:text-sm font-semibold text-gray-700">Soul Progress</span>
                        <span className="text-xs sm:text-sm font-bold text-orange-700">{dev.avgSoulPercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-orange-100 rounded-full h-2 sm:h-3 overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${dev.avgSoulPercent >= 80
                            ? 'bg-gradient-to-r from-green-500 to-green-600'
                            : dev.avgSoulPercent >= 50
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                              : 'bg-gradient-to-r from-orange-500 to-orange-600'
                            }`}
                          style={{ width: `${Math.min(100, Math.max(0, dev.avgSoulPercent))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 text-xs sm:text-sm mb-4">
                    {dev.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{dev.email}</span>
                      </div>
                    )}
                    {dev.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                        <span>{dev.phone}</span>
                      </div>
                    )}
                    {dev.hierarchy?.city && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">
                          {dev.hierarchy.city}
                          {dev.hierarchy.state && (
                            <span className="text-gray-400">, {dev.hierarchy.state}</span>
                          )}
                        </span>
                      </div>
                    )}
                    {dev.totalReports !== undefined && dev.totalReports > 0 && (
                      <div className="flex items-center gap-2 text-gray-600 pt-1 border-t border-gray-200">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
                        <span className="text-xs">{dev.totalReports} report{dev.totalReports !== 1 ? 's' : ''} (last 30 days)</span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/dashboard/sadhana/progress/${dev.id}`}
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
                    <span className="font-semibold">{Math.min(endIndex, filteredDevs.length)}</span> of{' '}
                    <span className="font-semibold">{filteredDevs.length}</span> users
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
                          // Show first page, last page, current page, and pages around current
                          return (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          );
                        })
                        .map((page, index, array) => {
                          // Add ellipsis if there's a gap
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
            {!loading && devs.length > 0 && (
              <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                  <p className="text-sm sm:text-base text-gray-700 font-semibold text-center sm:text-left">
                    <strong className="text-orange-700">Total Users:</strong> {devs.length}
                    {(searchTerm || selectedCampFilter !== 'all') && (
                      <span className="ml-2 text-gray-600">
                        (Showing {filteredDevs.length} matching result{filteredDevs.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
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
