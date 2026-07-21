'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/config';
import { updateUser, getUsersByRole, getUsersByHierarchy, getUsersByCenterIds } from '@/lib/supabase/users';
import { getBCVoiceManagerRequestByUserId } from '@/lib/supabase/bc-voice-manager-requests';
import { getTemplesFromSupabase } from '@/lib/supabase/temples';
import { getCentersFromSupabase, CenterData } from '@/lib/supabase/centers';
import { getCounselorsFromSupabase, CounselorData } from '@/lib/supabase/counselors';
import { User, UserRole, TempleData } from '@/types';
import { getSmallThumbnailUrl } from '@/lib/utils/google-drive';
import {
  Search, Filter, MapPin, Building2, MoreVertical,
  Shield, UserCheck, Briefcase, Mail, Phone, ExternalLink,
  Landmark, Users, Crown
} from 'lucide-react';
import { getRoleDisplayName, getHighestRole, hasRole, getRoleHierarchyNumber, roleNumberToName } from '@/lib/utils/roles';
import StatsSection from './StatsSection';
import RoleAssignmentModal from './RoleAssignmentModal';
import { toast } from 'react-hot-toast';

// Extended filter types
type FilterType = 'all' | 'pending' | 'leadership' | 'management' | 'field' | 'student';

// Camp Options Mapping
const CAMP_OPTIONS = [
  { label: 'DYS', value: 'campDys' },
  { label: 'Sankalpa', value: 'campSankalpa' },
  { label: 'Sphurti', value: 'campSphurti' },
  { label: 'Utkarsh', value: 'campUtkarsh' },
  { label: 'SRCGD Workshop', value: 'campSrcgdWorkshop' },
  { label: 'Nishtha', value: 'campNishtha' },
  { label: 'FTEC', value: 'campFtec' },
  { label: 'Ashraya', value: 'campAshraya' },
  { label: 'MTEC', value: 'campMtec' },
  { label: 'Sharanagati', value: 'campSharanagati' },
  { label: 'IDC', value: 'campIdc' },
];

export default function UsersPage() {
  const { userData, refreshUserData } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Filter State
  const [selectedRole, setSelectedRole] = useState<string>(''); // For specific role dropdown
  const [selectedCamp, setSelectedCamp] = useState('');
  const [selectedTemple, setSelectedTemple] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [selectedCounselor, setSelectedCounselor] = useState('');

  // DB Data State
  const [templesList, setTemplesList] = useState<TempleData[]>([]);
  const [centersList, setCentersList] = useState<CenterData[]>([]);
  const [counselorsList, setCounselorsList] = useState<CounselorData[]>([]);

  // Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Pagination State
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Load Data
  useEffect(() => {
    // Check access
    if (userData) {
      const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
      const isSuperAdmin = currentUserRoles.includes('super_admin') || currentUserRoles.includes(8);

      if (!isSuperAdmin) {
        router.push('/dashboard');
        return;
      }
    }

    const loadData = async () => {
      if (userData) {
        setLoading(true);
        try {
          let fetchedUsers: User[] = [];
          const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];

          // 1. Fetch Users logic
          if (currentUserRoles.includes('super_admin') || currentUserRoles.includes(8)) {
            // Super admin gets everyone
            fetchedUsers = await getUsersByHierarchy({});
          } else {
            fetchedUsers = [];
          }
          setUsers(fetchedUsers);

          // 2. Fetch Filter Options from DB
          const [temples, centers, counselors] = await Promise.all([
            getTemplesFromSupabase(),
            getCentersFromSupabase(),
            getCounselorsFromSupabase()
          ]);

          setTemplesList(temples);
          setCentersList(centers);
          setCounselorsList(counselors);

        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [userData, router]);

  // Filtering Logic (Client-side filtering of Users)
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // 1. Text Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = user.name?.toLowerCase().includes(query);
        const matchEmail = user.email?.toLowerCase().includes(query);
        const matchPhone = user.phone?.toLowerCase().includes(query);
        const matchLocation = (
          user.hierarchy?.city?.toLowerCase().includes(query) ||
          user.hierarchy?.center?.toLowerCase().includes(query) ||
          user.hierarchy?.currentTemple?.toLowerCase().includes(query)
        );

        if (!matchName && !matchEmail && !matchPhone && !matchLocation) return false;
      }

      // 2. Dropdown Filters
      // Role Filter
      if (selectedRole) {
        const userRoles = Array.isArray(user.role) ? user.role : [user.role];
        // Check if user has the selected role (handling string vs number)
        const hasSelectedRole = userRoles.some(r => {
          const rNum = getRoleHierarchyNumber(r);
          const selectedNum = getRoleHierarchyNumber(selectedRole as any);
          return rNum === selectedNum;
        });
        if (!hasSelectedRole) return false;
      }

      // Camp Filter
      if (selectedCamp) {
        if (!(user as any)[selectedCamp]) return false;
      }

      // Temple Filter
      if (selectedTemple) {
        const userTemple = user.hierarchy?.currentTemple || user.parentTemple;
        if (userTemple !== selectedTemple) return false;
      }

      // Center Filter
      if (selectedCenter) {
        const userCenter = user.hierarchy?.center || user.hierarchy?.currentCenter;
        if (userCenter !== selectedCenter) return false;
      }

      // Counselor Filter
      if (selectedCounselor) {
        const userCounselor = user.hierarchy?.counselor || user.hierarchy?.otherCounselor ||
          user.hierarchy?.brahmachariCounselor || user.hierarchy?.grihasthaCounselor;
        if (userCounselor !== selectedCounselor) return false;
      }

      // 3. Status Filters (Pills)
      if (filterType === 'pending') return user.verificationStatus === 'pending';

      if (!selectedRole && filterType !== 'all') {
        const userRoles = Array.isArray(user.role) ? user.role : [user.role];
        if (filterType === 'student') return userRoles.includes('student') || userRoles.includes(1);

        if (filterType === 'leadership') {
          return userRoles.some(r => getRoleHierarchyNumber(r) >= 8);
        }
        if (filterType === 'management') {
          return userRoles.some(r => {
            const n = getRoleHierarchyNumber(r);
            return n >= 5 && n <= 7;
          });
        }
        if (filterType === 'field') {
          return userRoles.some(r => {
            const n = getRoleHierarchyNumber(r);
            return n >= 2 && n <= 4;
          });
        }
      }

      return true;
    });
  }, [users, searchQuery, selectedRole, selectedTemple, selectedCenter, selectedCounselor, selectedCamp, filterType]);

  // Derived Options for Dropdowns (Cascading from DB Lists)

  // 1. Centers: Filter centersList based on selectedTemple (by name or ID)
  const availableCenters = useMemo(() => {
    if (!selectedTemple) return centersList;

    // Find the temple object for the selected name
    const templeObj = templesList.find(t => t.name === selectedTemple);

    // Filter centers that match this temple
    return centersList.filter(c => {
      // Match by ID if possible
      if (templeObj && c.temple_id === templeObj.id) return true;
      // Match by name as fallback
      if (c.temple_name === selectedTemple) return true;
      return false;
    });
  }, [centersList, selectedTemple, templesList]);

  // 2. Counselors: Filter counselorsList based on selectedCenter (by City)
  const availableCounselors = useMemo(() => {
    if (!selectedCenter) return counselorsList;

    // Find center object
    const centerObj = centersList.find(c => c.name === selectedCenter);

    if (centerObj) {
      // Filter counselors who are in the same city as the center
      // Note: This is an approximation since counselors aren't strictly linked to center IDs in the DB yet
      return counselorsList.filter(co => co.city === centerObj.city);
    }

    return counselorsList;
  }, [counselorsList, selectedCenter, centersList]);


  // All Roles List for Dropdown
  const allRolesList = useMemo(() => {
    // Generate list from 17 down to 1
    const roles = [];
    for (let i = 17; i >= 1; i--) {
      roles.push({
        id: i,
        label: getRoleDisplayName(i as UserRole)
      });
    }
    return roles;
  }, []);


  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      if (!supabase) {
        toast.error('System error: Supabase client not initialized');
        return;
      }

      const { data: sessionData } = await supabase?.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      
      toast.success('User deleted successfully');
      setUsers(users.filter(u => u.id !== userId));
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  // Role Management handlers
  const handleEditRole = (user: User) => {
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const handleSaveRoles = async (userId: string, newRoles: UserRole[], templeId?: string) => {
    try {
      const userToUpdate = users.find(u => u.id === userId);
      if (!userToUpdate) return;

      const oldRoles = (Array.isArray(userToUpdate.role) ? userToUpdate.role : [userToUpdate.role]) as any[];
      const addedRoles = newRoles.filter(r => !oldRoles.includes(r));
      const removedRoles = oldRoles.filter(r => !newRoles.includes(r));

      // 1. Update the user role
      await updateUser(userId, { role: newRoles });

      if (!supabase) {
        toast.error('System error: Supabase client not initialized');
        return;
      }

      // Check if roles were removed and cleanup centers table
      // Roles to check: Project Manager (15), Project Advisor (14), Acting Manager (16)
      // If user had these roles but now doesn't, set corresponding fields in centers table to null

      const hadPM = oldRoles.some((r: any) => getRoleHierarchyNumber(r) === 15);
      const hasPM = newRoles.some((r: any) => getRoleHierarchyNumber(r) === 15);

      const hadPA = oldRoles.some((r: any) => getRoleHierarchyNumber(r) === 14);
      const hasPA = newRoles.some((r: any) => getRoleHierarchyNumber(r) === 14);

      const hadAM = oldRoles.some((r: any) => getRoleHierarchyNumber(r) === 16);
      const hasAM = newRoles.some((r: any) => getRoleHierarchyNumber(r) === 16);

      if (hadPM && !hasPM) {
        await supabase.from('centers').update({
          project_manager_id: null,
          project_manager_name: null
        }).eq('project_manager_id', userId);
      }

      if (hadPA && !hasPA) {
        await supabase.from('centers').update({
          project_advisor_id: null,
          project_advisor_name: null
        }).eq('project_advisor_id', userId);
      }

      if (hadAM && !hasAM) {
        await supabase.from('centers').update({
          acting_manager_id: null,
          acting_manager_name: null
        }).eq('acting_manager_id', userId);
      }

      // toast.success('Roles updated successfully'); // This line was not in the original, but was in the instruction. I will add it.

      // 2. Sync with Temples Table if needed
      if (supabase) {
        // Handle Grants/Updates
        const roleToColumn: Record<number, { id: string, name: string }> = {
          11: { id: 'managing_director_id', name: 'managing_director_name' },
          12: { id: 'director_id', name: 'director_name' },
          13: { id: 'central_voice_manager_id', name: 'central_voice_manager_name' },
          21: { id: 'yp_id', name: 'yp_name' }
        };

        for (const roleId of [11, 12, 13, 21]) {
          if ((newRoles as any[]).includes(roleId) && templeId) {
            const config = roleToColumn[roleId];
            // Set user as director for THIS temple
            await supabase
              .from('temples')
              .update({
                [config.id]: userId,
                [config.name]: userToUpdate.name
              })
              .eq('id', templeId);

            // OPTIONAL: Clear them from OTHER temples for this specific role? 
            // Usually a person is MD of only one temple. 
            await supabase
              .from('temples')
              .update({ [config.id]: null, [config.name]: null })
              .eq(config.id, userId)
              .not('id', 'eq', templeId);
          }
        }

        // Handle Revocations
        for (const roleId of removedRoles) {
          const rNum = getRoleHierarchyNumber(roleId as any);
          if (roleToColumn[rNum]) {
            const config = roleToColumn[rNum];
            // Clear user from ANY temple where they held this role
            await supabase
              .from('temples')
              .update({ [config.id]: null, [config.name]: null })
              .eq(config.id, userId);
          }
        }
      }

      // Refresh local state
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRoles } : u));

      // Update temples list to reflect new assignments
      const updatedTemples = await getTemplesFromSupabase();
      setTemplesList(updatedTemples);

      // If self-update
      if (userId === userData?.id) {
        refreshUserData();
      }
    } catch (error) {
      console.error('Error updating roles and assignments:', error);
      alert('Failed to update roles/temple assignment');
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole, selectedTemple, selectedCenter, selectedCounselor, selectedCamp, filterType, itemsPerPage]);

  // Header/Filter visibility for mobile
  const [showFilters, setShowFilters] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Loading User Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black font-display bg-gradient-to-r from-gray-900 via-gray-700 to-gray-800 bg-clip-text text-transparent tracking-tight">
            User Management
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1 font-bold uppercase tracking-wider opacity-60">
            {users.length} Total Members • {filteredUsers.length} Filtered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-sm active:scale-95 transition-all"
          >
            <Filter className={`w-3.5 h-3.5 ${showFilters ? 'text-orange-500' : ''}`} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <StatsSection users={users} />

      {/* Controls Section */}
      <div className={`bg-white rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-xl shadow-gray-200/40 border border-gray-100 flex flex-col gap-4 md:gap-6 sticky top-4 z-30 transition-all ${showFilters ? 'max-h-[1000px] opacity-100' : 'max-h-[4.5rem] md:max-h-none overflow-hidden lg:overflow-visible'}`}>

        {/* Top Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-3 md:gap-4 justify-between items-start lg:items-center">
          {/* Search */}
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl md:rounded-2xl focus:ring-2 focus:ring-orange-100 placeholder:text-gray-400 text-sm font-bold transition-all"
            />
          </div>

          <div className={`flex flex-col sm:flex-row gap-3 w-full lg:w-auto transition-all lg:opacity-100 ${showFilters ? 'opacity-100' : 'opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto'}`}>
            {/* Role Dropdown */}
            <div className="relative min-w-[160px] w-full">
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  if (e.target.value) setFilterType('all');
                }}
                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border-none rounded-xl md:rounded-2xl appearance-none focus:ring-2 focus:ring-orange-100 font-bold text-xs text-gray-700 shadow-sm cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <option value="">All Roles</option>
                {allRolesList.map(role => (
                  <option key={role.id} value={role.id}>{role.label}</option>
                ))}
              </select>
              <Crown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-500 pointer-events-none" />
            </div>

            {/* Camp Dropdown */}
            <div className="relative min-w-[160px] w-full">
              <select
                value={selectedCamp}
                onChange={(e) => {
                  setSelectedCamp(e.target.value);
                  if (e.target.value) setFilterType('all');
                }}
                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border-none rounded-xl md:rounded-2xl appearance-none focus:ring-2 focus:ring-orange-100 font-bold text-xs text-gray-700 shadow-sm cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <option value="">All Camps</option>
                {CAMP_OPTIONS.map(camp => (
                  <option key={camp.value} value={camp.value}>{camp.label}</option>
                ))}
              </select>
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pt-4 border-t border-gray-50 transition-all lg:opacity-100 ${showFilters ? 'opacity-100 block' : 'opacity-0 hidden lg:grid pointer-events-none lg:pointer-events-auto'}`}>
          <div className="relative">
            <select
              value={selectedTemple}
              onChange={(e) => {
                setSelectedTemple(e.target.value);
                setSelectedCenter('');
                setSelectedCounselor('');
              }}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-100 rounded-xl appearance-none focus:ring-2 focus:ring-orange-100 font-bold text-xs text-gray-600 shadow-sm hover:border-gray-200 transition-colors"
            >
              <option value="">All Temples</option>
              {templesList.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
            <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedCenter}
              onChange={(e) => {
                setSelectedCenter(e.target.value);
                setSelectedCounselor('');
              }}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-100 rounded-xl appearance-none focus:ring-2 focus:ring-orange-100 font-bold text-xs text-gray-600 shadow-sm hover:border-gray-200 transition-colors"
            >
              <option value="">All Centers</option>
              {availableCenters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative sm:col-span-2 lg:col-span-1">
            <select
              value={selectedCounselor}
              onChange={(e) => setSelectedCounselor(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-100 rounded-xl appearance-none focus:ring-2 focus:ring-orange-100 font-bold text-xs text-gray-600 shadow-sm hover:border-gray-200 transition-colors"
            >
              <option value="">All Counselors</option>
              {availableCounselors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Quick Group Filters */}
        <div className={`flex flex-wrap gap-2 pt-2 transition-all lg:opacity-100 ${showFilters ? 'opacity-100' : 'opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto'}`}>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest py-1.5 mr-2">Quick:</span>
          {[
            { id: 'all', label: 'Reset' },
            { id: 'pending', label: 'Pending Approval' },
            ...(!selectedRole ? [
              { id: 'leadership', label: 'Leadership' },
              { id: 'management', label: 'Management' },
            ] : []),
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                setFilterType(pill.id as FilterType);
                if (pill.id === 'all') {
                  setSelectedRole('');
                  setSelectedTemple('');
                  setSelectedCenter('');
                  setSelectedCounselor('');
                  setSelectedCamp('');
                  setSearchQuery('');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 border ${filterType === pill.id
                ? 'bg-gray-900 text-white border-transparent shadow-md'
                : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="flex flex-col gap-3">
        {filteredUsers.length > 0 ? (
          paginatedUsers.map((user, index) => {
            const highestRole = getHighestRole(user.role || 'student');
            const roleName = getRoleDisplayName(highestRole);
            const isPending = user.verificationStatus === 'pending';

            return (
              <div
                key={user.id}
                className="group relative bg-white rounded-2xl md:rounded-3xl p-3 md:p-4 border border-gray-100 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-gray-200 flex flex-col md:flex-row md:items-center gap-4 group/item"
              >
                {/* Left: Avatar & Primary Info */}
                <div className="flex items-center gap-3 md:w-1/4 lg:w-1/5 shrink-0">
                  <div className="relative">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 shadow-inner flex items-center justify-center text-lg font-bold text-gray-400 overflow-hidden">
                      <span className="text-gray-400 text-lg font-bold">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                      {user.profileImage && (
                        <Image
                          src={getSmallThumbnailUrl(user.profileImage) || ''}
                          alt={user.name || 'User Profile'}
                          className="absolute inset-0 w-full h-full object-cover"
                          fill
                          unoptimized={true}
                        />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full shadow-md border border-gray-50 flex items-center justify-center">
                      <Shield className="w-3 h-3 text-orange-500" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm md:text-base leading-tight truncate" title={user.name}>
                      {user.name || 'Unknown User'}
                    </h3>
                    <p className="text-orange-600 font-black text-[9px] md:text-[10px] uppercase tracking-widest truncate mt-0.5">{roleName}</p>
                  </div>
                </div>

                {/* Middle: Contact Info (Hidden on mobile if needed, or compact) */}
                <div className="flex flex-col sm:flex-row md:flex-1 gap-2 sm:gap-6 md:gap-4 lg:gap-10">
                  {/* Email & Phone */}
                  <div className="space-y-1 min-w-0 sm:w-1/2 md:w-auto">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                      <Mail className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                      <span className="truncate" title={user.email}>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                        <Phone className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2 text-[11px] font-bold text-gray-400 min-w-0 sm:w-1/2 md:w-auto">
                    <MapPin className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
                    <span className="truncate leading-relaxed" title={`${user.hierarchy?.center || ''}, ${user.hierarchy?.currentTemple || ''}`}>
                      {user.hierarchy?.center || user.hierarchy?.currentTemple ? (
                        <>
                          {user.hierarchy?.center && <div>{user.hierarchy.center}</div>}
                          {user.hierarchy?.currentTemple && <div className="text-[10px] opacity-70">{user.hierarchy.currentTemple}</div>}
                        </>
                      ) : 'No Location Recorded'}
                    </span>
                  </div>
                </div>

                {/* Right: Status & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 md:w-1/4 lg:w-1/5 border-t md:border-t-0 pt-3 md:pt-0 mt-1 md:mt-0">
                  {/* Status Badge */}
                  <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0 ${isPending
                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                    {isPending ? 'Pending' : 'Active'}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/profile/${user.id}`)}
                      className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all active:scale-95"
                      title="View Profile"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteUser(user.id, user.name || 'Unknown User')}
                      className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all active:scale-95 flex items-center justify-center border border-transparent shadow-sm"
                      title="Delete User"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>

                    <button
                      onClick={() => handleEditRole(user)}
                      className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-gray-900/10 hover:shadow-gray-900/20 active:scale-95 transition-all text-center"
                    >
                      Assign Role
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
            <div className="bg-gray-50 p-4 rounded-full mb-4">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest">No matching users</p>
            <button
              onClick={() => {
                setFilterType('all');
                setSelectedRole('');
                setSelectedTemple('');
                setSelectedCenter('');
                setSelectedCounselor('');
                setSearchQuery('');
              }}
              className="mt-4 text-orange-600 font-black text-xs hover:underline uppercase tracking-widest"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-gray-100">
          <div className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest order-2 sm:order-1">
            {filteredUsers.length} users found • Page {currentPage}
          </div>

          <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
            {/* Items Per Page */}
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-gray-50 border-none rounded-xl text-[10px] font-black text-gray-600 py-2 pl-3 pr-8 focus:ring-2 focus:ring-orange-100 cursor-pointer uppercase tracking-widest"
            >
              <option value={20}>20 / Page</option>
              <option value={30}>30 / Page</option>
              <option value={50}>50 / Page</option>
            </select>

            {/* Page Navigation */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex-1 sm:flex-none px-3 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all active:scale-95 uppercase"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex-1 sm:flex-none px-3 py-2 bg-gray-900 border-none rounded-xl text-[10px] font-black text-white hover:bg-gray-800 disabled:opacity-30 transition-all active:scale-95 uppercase shadow-md shadow-gray-900/10"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      <RoleAssignmentModal
        isOpen={isRoleModalOpen}
        user={selectedUser}
        onClose={() => setIsRoleModalOpen(false)}
        onSave={handleSaveRoles}
        currentUserRoles={Array.isArray(userData?.role) ? userData.role : [userData?.role || 'student']}
        temples={templesList}
      />
    </div>
  );
}
