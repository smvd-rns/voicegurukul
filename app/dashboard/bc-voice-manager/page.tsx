'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { getUsersByHierarchy } from '@/lib/supabase/users';
import { fetchSadhanaHistory } from '@/lib/api/sadhana-client';
import { getBCVoiceManagerRequestByUserId } from '@/lib/supabase/bc-voice-manager-requests';
import { getCentersByLocationFromLocal, CenterData } from '@/lib/data/local-centers';
import { User, SadhanaReport } from '@/types';
import { Users, Loader2, Mail, Phone, MapPin, Building2, UserCircle, TrendingUp, Sparkles } from 'lucide-react';
import { getRoleDisplayName, roleToNumber, getUserMaxRoleLevel } from '@/lib/utils/roles';
import Link from 'next/link';

interface DevWithProgress extends User {
  avgSoulPercent?: number;
  progressRating?: string;
  progressColor?: string;
  progressBgColor?: string;
  totalReports?: number;
  centerName?: string;
}

export default function BCVoiceManagerPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [devs, setDevs] = useState<DevWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [approvedCenters, setApprovedCenters] = useState<string[]>([]);
  const [centers, setCenters] = useState<CenterData[]>([]);
  const [selectedCenterFilter, setSelectedCenterFilter] = useState<string>('all');

  // Check if user has counselor role (role 2)
  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const hasCounselorRole = userRoles.includes('counselor') || userRoles.includes(2);

  const loadApprovedCenters = useCallback(async () => {
    if (!user) return;

    try {
      const request = await getBCVoiceManagerRequestByUserId(user.id);
      console.log('BC Voice Manager request data:', {
        request,
        hasRequest: !!request,
        status: request?.status,
        approvedCenters: request?.approvedCenters,
        requestedCenters: request?.requestedCenters,
      });

      // If user has counselor role (role 2), they are approved - load their approved centers
      // Similar to counselor page - once role is assigned, show users
      if (hasCounselorRole && request) {
        if (request.approvedCenters && request.approvedCenters.length > 0) {
          console.log('Approved centers found:', request.approvedCenters);
          setApprovedCenters(request.approvedCenters);
          setLoading(false); // Set loading to false so we can show the page
        } else if (request.status === 'approved' && (!request.approvedCenters || request.approvedCenters.length === 0)) {
          // Approved but no centers assigned yet
          console.log('Request approved but no centers assigned yet');
          setApprovedCenters([]);
          setLoading(false);
        } else {
          // Fallback to requested centers if approved centers not set
          if (request.requestedCenters && request.requestedCenters.length > 0) {
            console.log('Using requested centers as fallback:', request.requestedCenters);
            setApprovedCenters(request.requestedCenters);
            setLoading(false);
          } else {
            setApprovedCenters([]);
            setLoading(false);
          }
        }
      } else {
        console.log('User does not have BC Voice Manager role or no request found');
        setApprovedCenters([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading approved centers:', error);
      setApprovedCenters([]);
      setLoading(false);
    }
  }, [user, hasCounselorRole]);

  const loadCenters = useCallback(async () => {
    try {
      const allCenters = await getCentersByLocationFromLocal();
      setCenters(allCenters);
    } catch (error) {
      console.error('Error loading centers:', error);
    }
  }, []);

  const loadDevs = useCallback(async () => {
    if (approvedCenters.length === 0 || centers.length === 0) {
      console.log('Cannot load devs - approvedCenters:', approvedCenters.length, 'centers:', centers.length);
      setLoading(false);
      return;
    }

    console.log('Loading devs for approved centers:', approvedCenters);
    setLoading(true);
    try {
      // Get devs from all approved centers
      const allDevs: DevWithProgress[] = [];

      // Collect all unique state/city combinations from approved centers
      const locationMap = new Map<string, { state: string; city: string; centerNames: string[] }>();

      for (const centerId of approvedCenters) {
        const center = centers.find(c => c.id === centerId || c.name === centerId);
        if (center) {
          const key = `${center.state}|${center.city}`;
          if (!locationMap.has(key)) {
            locationMap.set(key, { state: center.state, city: center.city, centerNames: [] });
          }
          locationMap.get(key)!.centerNames.push(center.name);
        }
      }

      console.log('Location map:', Array.from(locationMap.entries()));

      // Query users by location (state/city) for all approved centers
      for (const [key, location] of locationMap.entries()) {
        console.log(`Querying users in ${location.city}, ${location.state} for centers:`, location.centerNames);

        // Get all users from this state/city
        const usersByLocation = await getUsersByHierarchy({
          state: location.state,
          city: location.city,
        });

        console.log(`Found ${usersByLocation.length} total users in ${location.city}, ${location.state}`);

        // Filter by center names (case-insensitive, trim whitespace)
        const centerUsers = (usersByLocation as any[]).filter((user: any) => {
          const userCenter = user.hierarchy?.center?.trim().toLowerCase() || '';
          const matches = (location.centerNames as string[]).some((centerName: string) => {
            const targetCenter = centerName.trim().toLowerCase();
            return userCenter === targetCenter;
          });
          if (matches) {
            console.log(`Matched user ${user.name} (center: ${user.hierarchy?.center}) to one of: ${location.centerNames.join(', ')}`);
          }
          return matches;
        });

        console.log(`After filtering by center names, found ${centerUsers.length} users`);

        const currentUserRoleNum = getUserMaxRoleLevel(userData?.role || 'student');

        const visibleUsers = centerUsers.filter(u => {
          const targetUserRoleNum = getUserMaxRoleLevel(u.role);
          return targetUserRoleNum <= currentUserRoleNum;
        });

        // Filter to only students (devs)
        const students = visibleUsers.filter(user => {
          const roles = Array.isArray(user.role) ? user.role : [user.role];
          const isStudent = roles.includes('student') || roles.includes(1);
          return isStudent;
        });

        console.log(`Filtered to ${students.length} students (devs)`);

        // Add center name to each dev
        const devsWithCenter = students.map(dev => {
          return {
            ...dev,
            centerName: dev.hierarchy?.center || '',
          };
        });

        allDevs.push(...devsWithCenter);

        // Remove duplicates (in case a dev appears in multiple centers)
        const uniqueDevs = allDevs.filter((dev, index, self) =>
          index === self.findIndex(d => d.id === dev.id)
        );

        console.log(`Total unique devs found: ${uniqueDevs.length}`, uniqueDevs.map(d => ({ id: d.id, name: d.name, center: d.centerName })));

        // Fetch spiritual progress for each dev
        const devsWithProgress = await Promise.all(
          uniqueDevs.map(async (dev) => {
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

        setDevs(devsWithProgress);
      }
    } catch (error) {
      console.error('Error loading devs:', error);
    } finally {
      setLoading(false);
    }
  }, [approvedCenters, centers, userData]);

  useEffect(() => {
    if (!userData || !user) return;

    // Check if user has counselor role (role 2)
    if (!hasCounselorRole) {
      router.push('/dashboard');
      return;
    }

    // Load both in parallel
    Promise.all([loadApprovedCenters(), loadCenters()]).then(() => {
      console.log('Both approved centers and centers list loaded');
    });
  }, [userData, user, hasCounselorRole, router, loadApprovedCenters, loadCenters]);

  useEffect(() => {
    if (approvedCenters.length > 0 && centers.length > 0) {
      loadDevs();
    } else if (approvedCenters.length === 0) {
      setDevs([]);
      setLoading(false);
    }
  }, [approvedCenters, selectedCenterFilter, centers, loadDevs]);

  const filteredDevs = devs.filter(dev => {
    const matchesSearch =
      dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dev.phone && dev.phone.includes(searchTerm));

    const matchesCenter = selectedCenterFilter === 'all' || dev.centerName === selectedCenterFilter;

    return matchesSearch && matchesCenter;
  });

  if (!hasCounselorRole) {
    return null;
  }

  const approvedCenterNames = approvedCenters.map(centerId => {
    const center = centers.find(c => c.id === centerId || c.name === centerId);
    return center?.name || centerId;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <p className="text-base sm:text-lg md:text-xl font-serif text-orange-700 font-semibold mb-2">
            BC Voice Manager Dashboard
          </p>
          <p className="text-sm sm:text-base text-orange-600">
            Manage devs from your approved centers
          </p>
        </div>

        {/* Approved Centers Info */}
        {loading ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6 border border-orange-200">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
              <p className="text-gray-600">Loading approved centers...</p>
            </div>
          </div>
        ) : approvedCenters.length > 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6 border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-gray-800">Your Approved Centers ({approvedCenters.length})</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {approvedCenterNames.map((centerName, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium"
                >
                  {centerName}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <p className="text-yellow-800">
              {loading
                ? 'Loading approved centers...'
                : 'No approved centers assigned yet. Please contact super admin to assign centers to your BC Voice Manager role.'}
            </p>
          </div>
        )}

        {/* Search and Filter */}
        {devs.length > 0 && (
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
                    <option value="all">All Centers</option>
                    {approvedCenterNames.map((centerName, index) => (
                      <option key={index} value={centerName}>
                        {centerName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Devs List */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          </div>
        ) : filteredDevs.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-8 text-center border border-orange-200">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {approvedCenters.length === 0
                ? 'No approved centers assigned yet. Please contact super admin.'
                : searchTerm
                  ? 'No devs found matching your search.'
                  : 'No devs (students) found in your approved centers. This may be normal if no students are registered in these centers yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredDevs.map((dev) => (
              <div
                key={dev.id}
                className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6 border border-orange-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{dev.name}</h3>
                    {dev.centerName && (
                      <p className="text-xs text-gray-500 mb-2">
                        <Building2 className="h-3 w-3 inline mr-1" />
                        {dev.centerName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{dev.email}</span>
                  </div>
                  {dev.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{dev.phone}</span>
                    </div>
                  )}
                  {dev.hierarchy?.city && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{dev.hierarchy.city}, {dev.hierarchy.state}</span>
                    </div>
                  )}
                </div>

                {/* Spiritual Progress */}
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

                <Link
                  href={`/dashboard/sadhana/progress/${dev.id}`}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <TrendingUp className="h-4 w-4" />
                  View Progress Report
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
