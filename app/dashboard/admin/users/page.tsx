'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/config';
import { updateUser, getUsersByHierarchy } from '@/lib/supabase/users';
import { transformUserProfile } from '@/lib/supabase/user-transform';
import { getTemplesFromSupabase } from '@/lib/supabase/temples';
import { getCentersFromSupabase, CenterData } from '@/lib/supabase/centers';
import { getCounselorsFromSupabase, CounselorData } from '@/lib/supabase/counselors';
import { User, UserRole, TempleData } from '@/types';
import { getSmallThumbnailUrl } from '@/lib/utils/google-drive';
import {
  Search, Filter, MapPin, Building2,
  Shield, Mail, Phone,
  Landmark, Users, Crown, Pencil, Eye,
  Sparkles, CheckCircle2, Compass, RotateCcw,
  FileSpreadsheet, Download, ChevronDown
} from 'lucide-react';
import { getRoleDisplayName, getHighestRole, getRoleHierarchyNumber } from '@/lib/utils/roles';
import StatsSection from './StatsSection';
import RoleAssignmentModal from './RoleAssignmentModal';
import EditUserProfileModal from './EditUserProfileModal';
import UserDetailsModal from './UserDetailsModal';
import { toast } from 'react-hot-toast';

// Extended filter types
type FilterType = 'all' | 'pending' | 'other_none' | 'other_center' | 'leadership' | 'field' | 'student' | 'brahmachari' | 'grihastha';

// Official Website Profile Ashrams (matches Profile section exactly)
const PROFILE_ASHRAMS = [
  'Student and Not decided',
  'Working and Not Decided',
  'Gauranga Sabha',
  'Nityananda Sabha',
  'Grihastha',
  'Brahmachari',
  'Staying Single (Not planning to marry)',
] as const;

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

  // Dropdown Filter States
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedCamp, setSelectedCamp] = useState('');
  const [selectedTemple, setSelectedTemple] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [selectedCounselor, setSelectedCounselor] = useState('');

  // New Super Admin Filters
  const [selectedAshram, setSelectedAshram] = useState('');
  const [selectedInitiation, setSelectedInitiation] = useState('');
  const [selectedVerification, setSelectedVerification] = useState('');
  const [selectedRounds, setSelectedRounds] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // DB Data State
  const [templesList, setTemplesList] = useState<TempleData[]>([]);
  const [centersList, setCentersList] = useState<CenterData[]>([]);
  const [counselorsList, setCounselorsList] = useState<CounselorData[]>([]);

  // Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);

  // Pagination State
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Export to Excel State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Data with server optimization and instant session caching
  const loadData = async (forceRefresh = false) => {
    if (!userData) return;
    setLoading(true);
    try {
      const cacheKey = 'admin_users_data_cache_v2';
      if (!forceRefresh && typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 120000 && Array.isArray(parsed.users) && parsed.users.length > 0) {
              setUsers(parsed.users);
              setTemplesList(parsed.temples || []);
              setCentersList(parsed.centers || []);
              setCounselorsList(parsed.counselors || []);
              setLoading(false);
              return;
            }
          } catch (e) {}
        }
      }

      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;

      const res = await fetch(`/api/admin/users?_t=${Date.now()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.users)) {
        const transformedUsers = json.users.map((u: any) => transformUserProfile(u));
        setUsers(transformedUsers);
        setTemplesList(json.temples || []);
        setCentersList(json.centers || []);
        setCounselorsList(json.counselors || []);

        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            users: transformedUsers,
            temples: json.temples || [],
            centers: json.centers || [],
            counselors: json.counselors || []
          }));
        } catch (e) {}
      } else {
        // Fallback to legacy loader if API error
        console.warn('Falling back to legacy user loader:', json.error);
        const [fetchedUsers, temples, centers, counselors] = await Promise.all([
          getUsersByHierarchy({}),
          getTemplesFromSupabase(),
          getCentersFromSupabase(),
          getCounselorsFromSupabase()
        ]);
        setUsers(fetchedUsers);
        setTemplesList(temples);
        setCentersList(centers);
        setCounselorsList(counselors);
      }
    } catch (error) {
      console.error('Error loading admin users data:', error);
      toast.error('Failed to load users list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check access
    if (userData) {
      const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
      const isSuperAdmin = currentUserRoles.includes('super_admin') || currentUserRoles.includes(8);

      if (!isSuperAdmin) {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [userData, router]);

  // Dynamic Cities from user records
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      const city = u.hierarchy?.city;
      if (city && typeof city === 'string' && city.trim() !== '') {
        set.add(city.trim());
      }
    });
    return Array.from(set).sort();
  }, [users]);

  // Filtering Logic (Client-side filtering of Users)
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const hierarchy = user.hierarchy || {};

      // 1. Text Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const otherCenter = (user.otherCenter || hierarchy.otherCenter || (user as any).other_center || '').toLowerCase();
        const otherTemple = (user.otherTemple || hierarchy.otherTemple || (user as any).other_temple || '').toLowerCase();
        const otherCounselor = (user.otherCounselor || hierarchy.otherCounselor || (user as any).other_counselor || '').toLowerCase();
        const initiatedName = (hierarchy.initiatedName || '').toLowerCase();

        const matchName = user.name?.toLowerCase().includes(query) || initiatedName.includes(query);
        const matchEmail = user.email?.toLowerCase().includes(query);
        const matchPhone = user.phone?.toLowerCase().includes(query);
        const matchLocation = (
          hierarchy.city?.toLowerCase().includes(query) ||
          hierarchy.center?.toLowerCase().includes(query) ||
          hierarchy.currentTemple?.toLowerCase().includes(query) ||
          otherCenter.includes(query) ||
          otherTemple.includes(query) ||
          otherCounselor.includes(query)
        );

        if (!matchName && !matchEmail && !matchPhone && !matchLocation) return false;
      }

      // 2. Dropdown Filters
      // Role Filter
      if (selectedRole) {
        const userRoles = Array.isArray(user.role) ? user.role : [user.role];
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

      // Temple Filter (Supports '__other__' and '__none__')
      if (selectedTemple) {
        const userTemple = hierarchy.currentTemple || user.parentTemple || user.currentTemple;
        const hasOtherTemple = user.otherTemple || hierarchy.otherTemple || (user as any).other_temple || userTemple === 'Other';

        if (selectedTemple === '__other__') {
          if (!hasOtherTemple) return false;
        } else if (selectedTemple === '__none__') {
          if (userTemple && userTemple !== 'None' && !hasOtherTemple) return false;
        } else {
          if (!userTemple || userTemple.trim().toLowerCase() !== selectedTemple.trim().toLowerCase()) return false;
        }
      }

      // Center Filter (Supports '__other__' and '__none__')
      if (selectedCenter) {
        const userCenter = hierarchy.center || hierarchy.currentCenter || user.currentCenter || user.parentCenter;
        const hasOtherCenter = user.otherCenter || hierarchy.otherCenter || (user as any).other_center || userCenter === 'Other';

        if (selectedCenter === '__other__') {
          if (!hasOtherCenter) return false;
        } else if (selectedCenter === '__none__') {
          if (userCenter && userCenter !== 'None' && !hasOtherCenter) return false;
        } else {
          if (!userCenter || userCenter.trim().toLowerCase() !== selectedCenter.trim().toLowerCase()) return false;
        }
      }

      // Counselor Filter (Supports '__other__' and '__none__')
      if (selectedCounselor) {
        const userCounselor = hierarchy.counselor || hierarchy.otherCounselor ||
          hierarchy.brahmachariCounselor || hierarchy.grihasthaCounselor || user.otherCounselor || (user as any).other_counselor;
        const hasOtherCounselor = user.otherCounselor || hierarchy.otherCounselor || (user as any).other_counselor || userCounselor === 'Other';

        if (selectedCounselor === '__other__') {
          if (!hasOtherCounselor) return false;
        } else if (selectedCounselor === '__none__') {
          if (userCounselor && userCounselor !== 'None' && !hasOtherCounselor) return false;
        } else {
          if (userCounselor !== selectedCounselor) return false;
        }
      }

      // 3. Official Ashram Filter (Matches Profile section ashrams)
      if (selectedAshram) {
        const userAshram = (hierarchy.ashram || (user as any).ashram || '').trim().toLowerCase();
        const sel = selectedAshram.trim().toLowerCase();

        if (sel === 'student and not decided') {
          if (userAshram !== 'student and not decided' && userAshram !== 'student') return false;
        } else if (sel === 'working and not decided') {
          if (userAshram !== 'working and not decided') return false;
        } else if (sel === 'grihastha') {
          if (userAshram !== 'grihastha') return false;
        } else if (sel === 'brahmachari') {
          if (userAshram !== 'brahmachari') return false;
        } else if (sel === 'gauranga sabha') {
          if (userAshram !== 'gauranga sabha') return false;
        } else if (sel === 'nityananda sabha') {
          if (userAshram !== 'nityananda sabha') return false;
        } else if (sel === 'staying single (not planning to marry)') {
          if (userAshram !== 'staying single (not planning to marry)' && !userAshram.includes('single')) return false;
        } else {
          if (userAshram !== sel) return false;
        }
      }

      // Initiation Status Filter
      if (selectedInitiation) {
        const userInit = (hierarchy.initiationStatus || '').trim().toLowerCase();
        if (selectedInitiation === 'none') {
          if (userInit && userInit !== 'not initiated') return false;
        } else if (selectedInitiation === 'aspiring') {
          if (userInit !== 'aspiring') return false;
        } else if (selectedInitiation === 'initiated') {
          if (userInit !== 'initiated') return false;
        }
      }

      // Verification Status Filter
      if (selectedVerification) {
        const vStatus = user.verificationStatus || 'unverified';
        if (vStatus !== selectedVerification) return false;
      }

      // Chanting Rounds Filter
      if (selectedRounds) {
        const rounds = Number(hierarchy.rounds || 0);
        if (selectedRounds === '16plus' && rounds < 16) return false;
        if (selectedRounds === '8to15' && (rounds < 8 || rounds > 15)) return false;
        if (selectedRounds === '1to7' && (rounds < 1 || rounds > 7)) return false;
        if (selectedRounds === '0' && rounds > 0) return false;
      }

      // City Filter
      if (selectedCity) {
        const userCity = (hierarchy.city || '').trim().toLowerCase();
        if (userCity !== selectedCity.trim().toLowerCase()) return false;
      }

      // 4. Quick Group Filter Pills
      if (filterType === 'pending') return user.verificationStatus === 'pending';

      if (filterType === 'other_center') {
        const userCenter = hierarchy.center || hierarchy.currentCenter || user.currentCenter || user.parentCenter;
        return Boolean(user.otherCenter || hierarchy.otherCenter || (user as any).other_center || userCenter === 'Other');
      }

      if (filterType === 'other_none') {
        const userCenter = hierarchy.center || hierarchy.currentCenter || user.currentCenter || user.parentCenter;
        const isCenterOtherOrNone = !userCenter || userCenter === 'None' || userCenter === 'Other' || Boolean(user.otherCenter || hierarchy.otherCenter || (user as any).other_center);

        const userTemple = hierarchy.currentTemple || user.parentTemple || user.currentTemple;
        const isTempleOtherOrNone = !userTemple || userTemple === 'None' || userTemple === 'Other' || Boolean(user.otherTemple || hierarchy.otherTemple || (user as any).other_temple);

        const userCounselor = hierarchy.counselor || hierarchy.otherCounselor || hierarchy.brahmachariCounselor || hierarchy.grihasthaCounselor;
        const isCounselorOtherOrNone = !userCounselor || userCounselor === 'None' || userCounselor === 'Other' || Boolean(user.otherCounselor || hierarchy.otherCounselor || (user as any).other_counselor);

        return isCenterOtherOrNone || isTempleOtherOrNone || isCounselorOtherOrNone;
      }

      if (filterType === 'brahmachari') {
        const ashram = (hierarchy.ashram || (user as any).ashram || '').toLowerCase();
        return ashram === 'brahmachari';
      }

      if (filterType === 'grihastha') {
        const ashram = (hierarchy.ashram || (user as any).ashram || '').toLowerCase();
        return ashram === 'grihastha';
      }

      if (!selectedRole && filterType !== 'all') {
        const userRoles = Array.isArray(user.role) ? user.role : [user.role];
        if (filterType === 'student') {
          const ashram = (hierarchy.ashram || (user as any).ashram || '').toLowerCase();
          return userRoles.includes('student') || userRoles.includes(1) || ashram.includes('student');
        }

        if (filterType === 'leadership') {
          return userRoles.some(r => getRoleHierarchyNumber(r) >= 8);
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
  }, [
    users, searchQuery, selectedRole, selectedTemple, selectedCenter,
    selectedCounselor, selectedCamp, selectedAshram, selectedInitiation,
    selectedVerification, selectedRounds, selectedCity, filterType
  ]);

  const isFiltered = Boolean(
    searchQuery ||
    selectedRole ||
    selectedCamp ||
    selectedTemple ||
    selectedCenter ||
    selectedCounselor ||
    selectedAshram ||
    selectedInitiation ||
    selectedVerification ||
    selectedRounds ||
    selectedCity ||
    filterType !== 'all'
  );

  const resetAllFilters = () => {
    setFilterType('all');
    setSelectedRole('');
    setSelectedTemple('');
    setSelectedCenter('');
    setSelectedCounselor('');
    setSelectedCamp('');
    setSelectedAshram('');
    setSelectedInitiation('');
    setSelectedVerification('');
    setSelectedRounds('');
    setSelectedCity('');
    setSearchQuery('');
  };

  // Derived Options for Dropdowns (Cascading from DB Lists)
  const availableCenters = useMemo(() => {
    if (!selectedTemple || selectedTemple === '__other__' || selectedTemple === '__none__') return centersList;

    const templeObj = templesList.find(
      t => t.name?.trim().toLowerCase() === selectedTemple.trim().toLowerCase() || t.id === selectedTemple
    );

    return centersList.filter(c => {
      if (templeObj && c.temple_id && c.temple_id === templeObj.id) return true;
      if (c.temple_id && c.temple_id === selectedTemple) return true;
      if (c.temple_name && c.temple_name.trim().toLowerCase() === selectedTemple.trim().toLowerCase()) return true;
      return false;
    });
  }, [centersList, selectedTemple, templesList]);

  const availableCounselors = useMemo(() => {
    if (!selectedCenter || selectedCenter === '__other__' || selectedCenter === '__none__') return counselorsList;

    const centerObj = centersList.find(c => c.name === selectedCenter);
    if (centerObj) {
      return counselorsList.filter(co => co.city === centerObj.city);
    }
    return counselorsList;
  }, [counselorsList, selectedCenter, centersList]);

  // All Roles List for Dropdown
  const allRolesList = useMemo(() => {
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
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;

      setUsers(users.filter(u => u.id !== userId));
      if (typeof window !== 'undefined') sessionStorage.removeItem('admin_users_data_cache_v2');
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleEditRole = (user: User) => {
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const handleEditProfile = (user: User) => {
    setUserToEdit(user);
    setIsEditProfileModalOpen(true);
  };

  const handleViewDetails = (user: User) => {
    setSelectedUserDetails(user);
    setIsDetailsModalOpen(true);
  };

  const handleStatusChange = async (userId: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      await updateUser(userId, { verificationStatus: newStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, verificationStatus: newStatus } : u));
      if (typeof window !== 'undefined') sessionStorage.removeItem('admin_users_data_cache_v2');
      if (selectedUserDetails && selectedUserDetails.id === userId) {
        setSelectedUserDetails({ ...selectedUserDetails, verificationStatus: newStatus });
      }
      toast.success(`User status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleSaveUserProfile = async (userId: string, updatedData: Partial<User>) => {
    const targetUserId = userId || userToEdit?.id;
    if (!targetUserId) return;

    try {
      await updateUser(targetUserId, updatedData);
      setUsers(users.map(u => u.id === targetUserId ? { ...u, ...updatedData } : u));
      if (typeof window !== 'undefined') sessionStorage.removeItem('admin_users_data_cache_v2');
      if (selectedUserDetails && selectedUserDetails.id === targetUserId) {
        setSelectedUserDetails({ ...selectedUserDetails, ...updatedData });
      }
      setIsEditProfileModalOpen(false);
      setUserToEdit(null);
      toast.success('User profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleSaveRoles = async (userId: string, newRoles: UserRole[], templeId?: string, centerId?: string, canViewAllDonations?: boolean) => {
    try {
      const userToUpdate = users.find(u => u.id === userId);
      if (!userToUpdate) return;

      const currentRoles = Array.isArray(userToUpdate.role) ? userToUpdate.role : [userToUpdate.role];
      const removedRoles = currentRoles.filter(r => !newRoles.includes(r));

      // 1. Sync with Centers Table
      const hadCM = currentRoles.includes(4) || currentRoles.includes('center_manager' as any);
      const hasCM = newRoles.includes(4) || newRoles.includes('center_manager' as any);

      if (hasCM && centerId) {
        await supabase.from('centers').update({
          manager_id: userId,
          manager_name: userToUpdate.name
        }).eq('id', centerId);
      }

      if (hadCM && !hasCM) {
        await supabase.from('centers').update({
          manager_id: null,
          manager_name: null
        }).eq('manager_id', userId);
      }

      const hadAM = currentRoles.includes(10) || currentRoles.includes('acting_manager' as any);
      const hasAM = newRoles.includes(10) || newRoles.includes('acting_manager' as any);

      if (hasAM && centerId) {
        await supabase.from('centers').update({
          acting_manager_id: userId,
          acting_manager_name: userToUpdate.name
        }).eq('id', centerId);
      }

      if (hadAM && !hasAM) {
        await supabase.from('centers').update({
          acting_manager_id: null,
          acting_manager_name: null
        }).eq('acting_manager_id', userId);
      }

      // 2. Sync with Temples Table if needed
      const roleToColumn: Record<number, { id: string, name: string }> = {
        11: { id: 'managing_director_id', name: 'managing_director_name' },
        12: { id: 'director_id', name: 'director_name' },
        13: { id: 'central_voice_manager_id', name: 'central_voice_manager_name' },
        21: { id: 'yp_id', name: 'yp_name' }
      };

      for (const roleId of [11, 12, 13, 21]) {
        if ((newRoles as any[]).includes(roleId) && templeId) {
          const config = roleToColumn[roleId];
          await supabase
            .from('temples')
            .update({
              [config.id]: userId,
              [config.name]: userToUpdate.name
            })
            .eq('id', templeId);

          await supabase
            .from('temples')
            .update({ [config.id]: null, [config.name]: null })
            .eq(config.id, userId)
            .not('id', 'eq', templeId);
        }
      }

      for (const roleId of removedRoles) {
        const rNum = getRoleHierarchyNumber(roleId as any);
        if (roleToColumn[rNum]) {
          const config = roleToColumn[rNum];
          await supabase
            .from('temples')
            .update({ [config.id]: null, [config.name]: null })
            .eq(config.id, userId);
        }
      }

      // 3. Update users table in db
      await updateUser(userId, {
        role: newRoles,
        ...(canViewAllDonations !== undefined ? { canViewAllDonations, can_view_all_donations: canViewAllDonations } : {})
      });

      // Refresh local state
      setUsers(users.map(u => u.id === userId ? { 
        ...u, 
        role: newRoles,
        ...(canViewAllDonations !== undefined ? { canViewAllDonations, can_view_all_donations: canViewAllDonations } : {})
      } : u));
      if (typeof window !== 'undefined') sessionStorage.removeItem('admin_users_data_cache_v2');

      if (selectedUserDetails && selectedUserDetails.id === userId) {
        setSelectedUserDetails({
          ...selectedUserDetails,
          role: newRoles,
          ...(canViewAllDonations !== undefined ? { canViewAllDonations, can_view_all_donations: canViewAllDonations } : {})
        });
      }

      const updatedTemples = await getTemplesFromSupabase();
      setTemplesList(updatedTemples);

      if (userId === userData?.id) {
        refreshUserData();
      }

      toast.success('Roles updated successfully');
    } catch (error) {
      console.error('Error updating roles and assignments:', error);
      alert('Failed to update roles/temple assignment');
    }
  };

  // Export to Excel handler
  const handleExportExcel = async (type: 'filtered' | 'all') => {
    const targetUsers = type === 'filtered' ? filteredUsers : users;
    if (targetUsers.length === 0) {
      toast.error('No users available to export');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading(`Preparing Excel export for ${targetUsers.length} users...`);

    try {
      const XLSX = await import('xlsx');

      const excelData = targetUsers.map((u, index) => {
        const hierarchy = u.hierarchy || {};
        const userRoles = Array.isArray(u.role) ? u.role : [u.role || 'student'];
        const highestRole = getHighestRole(u.role || 'student');
        const roleDisplayName = getRoleDisplayName(highestRole);
        const allRolesStr = userRoles.map(r => getRoleDisplayName(r)).join(', ');

        // Resolved Temple
        const otherTempleText = u.otherTemple || hierarchy.otherTemple || (u as any).other_temple;
        const rawTemple = hierarchy.currentTemple || u.currentTemple || u.parentTemple;
        const displayTemple = (rawTemple === 'Other' || Boolean(otherTempleText))
          ? (otherTempleText ? `Other: ${otherTempleText}` : 'Other')
          : (rawTemple || 'None');

        // Resolved Center
        const otherCenterText = u.otherCenter || hierarchy.otherCenter || (u as any).other_center;
        const rawCenter = hierarchy.currentCenter || hierarchy.center || u.currentCenter || u.parentCenter;
        const displayCenter = (rawCenter === 'Other' || Boolean(otherCenterText))
          ? (otherCenterText ? `Other: ${otherCenterText}` : 'Other')
          : (rawCenter || 'None');

        // Resolved Counselor
        const otherCounselorText = u.otherCounselor || hierarchy.otherCounselor || (u as any).other_counselor;
        const rawCounselor = hierarchy.counselor || hierarchy.brahmachariCounselor || hierarchy.grihasthaCounselor;
        const displayCounselor = (rawCounselor === 'Other' || Boolean(otherCounselorText))
          ? (otherCounselorText ? `Other: ${otherCounselorText}` : 'Other')
          : (rawCounselor || 'None');

        // Completed Camps
        const completedCamps = CAMP_OPTIONS
          .filter(c => Boolean((u as any)[c.value]))
          .map(c => c.label)
          .join(', ');

        // Format dates
        const registeredDate = u.createdAt 
          ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : '';

        return {
          'Sr No': index + 1,
          'Legal Name': u.name || '',
          'Initiated Name': hierarchy.initiatedName || '',
          'Email': u.email || '',
          'Phone': u.phone || '',
          'Primary Role': roleDisplayName,
          'All Roles': allRolesStr,
          'Verification Status': (u.verificationStatus || 'unverified').toUpperCase(),
          'Ashram': hierarchy.ashram || (u as any).ashram || '',
          'Temple': displayTemple,
          'Center': displayCenter,
          'Counselor': displayCounselor,
          'City': hierarchy.city || '',
          'State': hierarchy.state || '',
          'Zone': hierarchy.zone || '',
          'Initiation Status': hierarchy.initiationStatus || '',
          'Spiritual Master': hierarchy.spiritualMasterName || hierarchy.aspiringSpiritualMasterName || '',
          'Chanting Rounds': hierarchy.rounds ?? '',
          'Chanting Since': hierarchy.chantingSince || '',
          'Introduced to KC In': hierarchy.introducedToKcIn || u.introducedToKcIn || '',
          'KC Status': hierarchy.kcStatus || '',
          'Date of Birth': u.birthDate || '',
          'Completed Camps': completedCamps,
          'Registered Date': registeredDate,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Users Directory');

      // Auto-calculate column widths
      const colWidths = Object.keys(excelData[0] || {}).map(key => {
        let maxLen = key.length;
        excelData.forEach(row => {
          const val = (row as any)[key];
          if (val !== undefined && val !== null) {
            maxLen = Math.max(maxLen, String(val).length);
          }
        });
        return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
      });
      worksheet['!cols'] = colWidths;

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = type === 'filtered'
        ? `voicegurukul_users_filtered_${dateStr}.xlsx`
        : `voicegurukul_users_all_${dateStr}.xlsx`;

      XLSX.writeFile(workbook, filename);
      toast.success(`Exported ${targetUsers.length} users to Excel!`, { id: toastId });
    } catch (error) {
      console.error('Error exporting users to Excel:', error);
      toast.error('Failed to export Excel file', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery, selectedRole, selectedTemple, selectedCenter,
    selectedCounselor, selectedCamp, selectedAshram, selectedInitiation,
    selectedVerification, selectedRounds, selectedCity, filterType, itemsPerPage
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold text-xs animate-pulse tracking-wide uppercase">Loading User Directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-2.5 sm:p-4 lg:p-6 space-y-3 sm:space-y-3.5 text-slate-800">
      {/* Header Section: Compact on 13"-14" Laptops */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-black font-display text-slate-900 tracking-tight flex items-center gap-2">
            <span>User Management</span>
          </h1>
          <p className="text-[10.5px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">
            {users.length} Total Members • {filteredUsers.length} Filtered
            {isFiltered && (
              <span className="ml-2 px-2 py-0.2 rounded-full text-[9.5px] bg-amber-100 text-amber-900 font-extrabold normal-case border border-amber-300">
                Filtered View Active
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Export to Excel Dropdown / Button */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => {
                if (isFiltered) {
                  setShowExportMenu(prev => !prev);
                } else {
                  handleExportExcel('all');
                }
              }}
              disabled={isExporting || users.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title={isFiltered ? "Export filtered or all users to Excel" : "Export all users to Excel"}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
              <span>
                {isExporting ? 'Exporting...' : isFiltered ? `Export Excel (${filteredUsers.length})` : 'Export Excel'}
              </span>
              {isFiltered && (
                <ChevronDown className={`w-3 h-3 text-emerald-200 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              )}
            </button>

            {/* Dropdown for when Filtered */}
            {showExportMenu && isFiltered && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Excel Export Options
                </div>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExportExcel('filtered');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Filtered Members</span>
                  </span>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    {filteredUsers.length}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExportExcel('all');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between border-t border-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>All Members</span>
                  </span>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                    {users.length}
                  </span>
                </button>
              </div>
            )}
          </div>

          {isFiltered && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-2xs active:scale-95 transition-all hover:bg-slate-50 hover:border-slate-400 cursor-pointer"
          >
            <Filter className={`w-3.5 h-3.5 ${showFilters || isFiltered ? 'text-amber-500' : 'text-slate-500'}`} />
            <span>{showFilters ? 'Hide Advanced Filters' : 'Advanced Filters'}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Stats Section (4 Cards - Management removed, dynamic on filter) */}
      <StatsSection users={filteredUsers} totalCount={users.length} isFiltered={isFiltered} />

      {/* Filter & Controls Panel with Crisp, Distinct Borders */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-300 shadow-xs flex flex-col gap-2.5">
        {/* Primary Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-2.5 items-center">
          {/* Search Box */}
          <div className="relative group sm:col-span-2 lg:col-span-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
            <input
              type="text"
              placeholder="Search legal/initiated name, email, phone, city, center..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 rounded-xl focus:ring-2 focus:ring-amber-100 placeholder:text-slate-400 text-xs font-medium transition-all shadow-2xs"
            />
          </div>

          {/* Role Dropdown */}
          <div className="relative sm:col-span-1 lg:col-span-3">
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                if (e.target.value) setFilterType('all');
              }}
              className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 rounded-xl appearance-none focus:ring-2 focus:ring-amber-100 font-bold text-xs text-slate-700 shadow-2xs cursor-pointer transition-colors"
            >
              <option value="">All Roles</option>
              {allRolesList.map(role => (
                <option key={role.id} value={role.id}>{role.label}</option>
              ))}
            </select>
            <Crown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500 pointer-events-none" />
          </div>

          {/* Official Website Profile Ashram Dropdown */}
          <div className="relative sm:col-span-1 lg:col-span-2">
            <select
              value={selectedAshram}
              onChange={(e) => setSelectedAshram(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 rounded-xl appearance-none focus:ring-2 focus:ring-amber-100 font-bold text-xs text-slate-700 shadow-2xs cursor-pointer transition-colors"
            >
              <option value="">All Ashrams</option>
              {PROFILE_ASHRAMS.map(ash => (
                <option key={ash} value={ash}>{ash}</option>
              ))}
            </select>
            <Compass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500 pointer-events-none" />
          </div>

          {/* Camp Dropdown */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <select
              value={selectedCamp}
              onChange={(e) => {
                setSelectedCamp(e.target.value);
                if (e.target.value) setFilterType('all');
              }}
              className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 rounded-xl appearance-none focus:ring-2 focus:ring-amber-100 font-bold text-xs text-slate-700 shadow-2xs cursor-pointer transition-colors"
            >
              <option value="">All Camps</option>
              {CAMP_OPTIONS.map(camp => (
                <option key={camp.value} value={camp.value}>{camp.label}</option>
              ))}
            </select>
            <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500 pointer-events-none" />
          </div>
        </div>

        {/* Secondary / Advanced Filters with High-Contrast Visible Borders */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 pt-2 border-t border-slate-200 transition-all ${showFilters ? 'grid' : 'hidden lg:grid'}`}>
          {/* Temple Filter */}
          <div className="relative">
            <select
              value={selectedTemple}
              onChange={(e) => {
                setSelectedTemple(e.target.value);
                setSelectedCenter('');
                setSelectedCounselor('');
              }}
              className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 rounded-xl appearance-none focus:ring-2 focus:ring-amber-100 font-bold text-xs text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <option value="">All Temples</option>
              <option value="__other__">⚠️ Other Temple (Custom)</option>
              <option value="__none__">⚪ None / Unassigned</option>
              <option disabled>──────────</option>
              {templesList.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
            <Landmark className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>

          {/* Center Filter */}
          <div className="relative">
            <select
              value={selectedCenter}
              onChange={(e) => {
                setSelectedCenter(e.target.value);
                setSelectedCounselor('');
              }}
              className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 rounded-xl appearance-none focus:ring-2 focus:ring-amber-100 font-bold text-xs text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <option value="">All Centers</option>
              <option value="__other__">⚠️ Other Center (Custom)</option>
              <option value="__none__">⚪ None / Unassigned</option>
              <option disabled>──────────</option>
              {availableCenters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>

          {/* Counselor Filter */}
          <div className="relative">
            <select
              value={selectedCounselor}
              onChange={(e) => setSelectedCounselor(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 rounded-xl appearance-none focus:ring-2 focus:ring-amber-100 font-bold text-xs text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <option value="">All Counselors</option>
              <option value="__other__">⚠️ Other Counselor (Custom)</option>
              <option value="__none__">⚪ None / No Counselor</option>
              <option disabled>──────────</option>
              {availableCounselors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>

          {/* Initiation Status Filter */}
          <div className="relative">
            <select
              value={selectedInitiation}
              onChange={(e) => setSelectedInitiation(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 rounded-xl appearance-none focus:ring-2 focus:ring-amber-100 font-bold text-xs text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <option value="">All Initiation Status</option>
              <option value="initiated">Initiated</option>
              <option value="aspiring">Aspiring</option>
              <option value="none">Not Initiated</option>
            </select>
            <Sparkles className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500 pointer-events-none" />
          </div>

          {/* Verification Status Filter */}
          <div className="relative">
            <select
              value={selectedVerification}
              onChange={(e) => setSelectedVerification(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 rounded-xl appearance-none focus:ring-2 focus:ring-amber-100 font-bold text-xs text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <option value="">All Verification Status</option>
              <option value="approved">Approved (Active)</option>
              <option value="pending">Pending Approval</option>
              <option value="rejected">Rejected</option>
              <option value="incomplete">Incomplete</option>
            </select>
            <CheckCircle2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500 pointer-events-none" />
          </div>

          {/* Chanting Rounds Filter */}
          <div className="relative">
            <select
              value={selectedRounds}
              onChange={(e) => setSelectedRounds(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 rounded-xl appearance-none focus:ring-2 focus:ring-amber-100 font-bold text-xs text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <option value="">All Chanting Rounds</option>
              <option value="16plus">16+ Rounds</option>
              <option value="8to15">8 - 15 Rounds</option>
              <option value="1to7">1 - 7 Rounds</option>
              <option value="0">0 Rounds</option>
            </select>
            <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-500 pointer-events-none" />
          </div>

          {/* City Filter */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 hover:border-slate-400 focus:border-amber-500 rounded-xl appearance-none focus:ring-2 focus:ring-amber-100 font-bold text-xs text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <option value="">All Cities ({availableCities.length})</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-500 pointer-events-none" />
          </div>
        </div>

        {/* Quick Filter Pills with Defined Borders */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-200">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Quick:</span>
          {[
            { id: 'all', label: 'Reset All' },
            { id: 'pending', label: 'Pending Approval' },
            { id: 'brahmachari', label: 'Brahmacharis' },
            { id: 'grihastha', label: 'Grihasthas' },
            { id: 'student', label: 'Students' },
            { id: 'other_none', label: '⚠️ Other / None' },
            { id: 'other_center', label: 'Other Center' },
            ...(!selectedRole ? [
              { id: 'leadership', label: 'Leadership' },
            ] : []),
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                if (pill.id === 'all') {
                  resetAllFilters();
                } else {
                  setFilterType(pill.id as FilterType);
                }
              }}
              className={`px-3 py-1 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer ${filterType === pill.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-amber-500 hover:text-amber-800 hover:bg-amber-50/50 shadow-2xs'
                }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users List with Distinct Elevated Cards & Crisp Borders */}
      <div className="flex flex-col gap-2.5">
        {filteredUsers.length > 0 ? (
          paginatedUsers.map((user) => {
            const highestRole = getHighestRole(user.role || 'student');
            const roleName = getRoleDisplayName(highestRole);
            const isPending = user.verificationStatus === 'pending';
            const hierarchy = user.hierarchy || {};

            // Ashram & Spiritual Data
            const ashram = hierarchy.ashram || (user as any).ashram;
            const rounds = hierarchy.rounds;
            const initiationStatus = hierarchy.initiationStatus;
            const initiatedName = hierarchy.initiatedName;

            // Resolved Center, Temple, Counselor
            const otherCenterText = user.otherCenter || hierarchy.otherCenter || (user as any).other_center;
            const rawCenter = hierarchy.currentCenter || hierarchy.center || user.currentCenter || user.parentCenter;
            const isOtherCenter = rawCenter === 'Other' || Boolean(otherCenterText);

            const otherTempleText = user.otherTemple || hierarchy.otherTemple || (user as any).other_temple;
            const rawTemple = hierarchy.currentTemple || user.currentTemple || user.parentTemple;
            const isOtherTemple = rawTemple === 'Other' || Boolean(otherTempleText);

            const otherCounselorText = user.otherCounselor || hierarchy.otherCounselor || (user as any).other_counselor;
            const rawCounselor = hierarchy.counselor || hierarchy.brahmachariCounselor || hierarchy.grihasthaCounselor;
            const isOtherCounselor = rawCounselor === 'Other' || Boolean(otherCounselorText);

            return (
              <div
                key={user.id}
                className="group relative bg-white rounded-2xl p-3 sm:px-4 sm:py-3.5 border border-slate-200/90 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all duration-200 flex flex-col md:flex-row md:items-center gap-2.5 md:gap-4"
              >
                {/* Left: Avatar & Identity */}
                <div className="flex items-center gap-3 md:w-1/4 lg:w-1/4 shrink-0">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 shadow-inner flex items-center justify-center text-sm font-bold text-slate-500 overflow-hidden">
                      <span className="text-slate-600 text-sm font-bold">
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
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full shadow-2xs border border-slate-300 flex items-center justify-center">
                      <Shield className="w-2.5 h-2.5 text-amber-500" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug truncate" title={user.name}>
                      {user.name || 'Unknown User'}
                    </h3>
                    {initiatedName && (
                      <p className="text-[10px] font-bold text-amber-700 leading-tight truncate">
                        {initiatedName}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-300 font-extrabold text-[9px] uppercase tracking-wider truncate">
                        {roleName}
                      </span>
                      {ashram && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold text-[9px] truncate">
                          {ashram}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Contact Info & Allocation */}
                <div className="flex flex-col sm:flex-row md:flex-1 gap-2 sm:gap-4 md:gap-4 lg:gap-6 min-w-0">
                  {/* Email & Phone */}
                  <div className="space-y-0.5 min-w-0 sm:w-1/2 md:w-auto">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate" title={user.email}>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Location & Organization */}
                  <div className="flex flex-col gap-0.5 text-[11px] font-medium min-w-0 sm:w-1/2 md:w-auto flex-1">
                    {/* Temple */}
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Landmark className="w-3 h-3 text-slate-400 shrink-0" />
                      {isOtherTemple ? (
                        <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-300 rounded font-semibold text-[10px]">
                          Other Temple: {otherTempleText || 'Unspecified'}
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-700 truncate">{rawTemple || 'No Temple'}</span>
                      )}
                    </div>

                    {/* Center - hidden for Brahmachari & Grihastha */}
                    {ashram !== 'Brahmachari' && ashram !== 'Grihastha' && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        {isOtherCenter ? (
                          <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-300 rounded font-semibold text-[10px]">
                            Other Center: {otherCenterText || 'Unspecified'}
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-700 truncate">{rawCenter || 'No Center'}</span>
                        )}
                      </div>
                    )}

                    {/* Counselor */}
                    {(rawCounselor || isOtherCounselor) && (
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                        <Users className="w-3 h-3 text-slate-400 shrink-0" />
                        {isOtherCounselor ? (
                          <span className="px-1.5 py-0.2 bg-orange-50 text-orange-800 border border-orange-300 rounded font-semibold">
                            Other: {otherCounselorText || 'Unspecified'}
                          </span>
                        ) : (
                          <span className="truncate">Counselor: {rawCounselor}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Spiritual Status Badges (Rounds, Initiation) */}
                  {(rounds || initiationStatus) && (
                    <div className="hidden xl:flex flex-col gap-0.5 text-[10px] shrink-0 justify-center">
                      {rounds !== undefined && rounds !== null && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-bold whitespace-nowrap">
                          📿 {rounds} Rounds
                        </span>
                      )}
                      {initiationStatus && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold capitalize whitespace-nowrap">
                          ✨ {initiationStatus}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Status Badge & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-2 md:w-auto shrink-0 border-t md:border-t-0 pt-2 md:pt-0 mt-0.5 md:mt-0">
                  {/* Status Badge */}
                  <div className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border shrink-0 ${isPending
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    }`}>
                    {isPending ? 'Pending' : 'Active'}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View Details */}
                    <button
                      onClick={() => handleViewDetails(user)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 border border-slate-300 hover:border-slate-400 shadow-2xs cursor-pointer"
                      title="View Full Profile Details"
                    >
                      <Eye className="w-3 h-3 text-slate-500" />
                      <span>Details</span>
                    </button>

                    {/* Edit Profile */}
                    <button
                      onClick={() => handleEditProfile(user)}
                      className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 border border-orange-300 shadow-2xs cursor-pointer"
                      title="Edit User Profile"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    {/* Assign Role */}
                    <button
                      onClick={() => handleEditRole(user)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-2xs active:scale-95 transition-all text-center cursor-pointer"
                      title="Assign Roles"
                    >
                      Assign Role
                    </button>

                    {/* Delete User */}
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name || 'Unknown User')}
                      className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all active:scale-95 flex items-center justify-center border border-slate-300 hover:border-rose-500 shadow-2xs cursor-pointer"
                      title="Delete User"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-300 shadow-xs">
            <div className="bg-slate-50 p-3 rounded-full mb-3 border border-slate-200">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">No matching users found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your filters or search query</p>
            <button
              onClick={resetAllFilters}
              className="mt-3 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Pagination Controls with Defined Borders */}
      {filteredUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 border-t border-slate-200">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider order-2 sm:order-1">
            {filteredUsers.length} users found • Page {currentPage} of {totalPages || 1}
          </div>

          <div className="flex items-center gap-2.5 order-1 sm:order-2 w-full sm:w-auto">
            {/* Items Per Page */}
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-[10px] sm:text-[11px] font-bold text-slate-700 py-1.5 pl-2.5 pr-7 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 cursor-pointer uppercase tracking-wider shadow-2xs"
            >
              <option value={20}>20 / Page</option>
              <option value={30}>30 / Page</option>
              <option value={50}>50 / Page</option>
              <option value={100}>100 / Page</option>
            </select>

            {/* Page Navigation */}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all active:scale-95 uppercase shadow-2xs cursor-pointer"
              >
                Prev
              </button>
              <span className="text-xs font-bold text-slate-700 px-2">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-900 border-none rounded-lg text-[10px] font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition-all active:scale-95 uppercase shadow-2xs cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal (Superadmin Full View) */}
      <UserDetailsModal
        isOpen={isDetailsModalOpen}
        user={selectedUserDetails}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedUserDetails(null);
        }}
        onEditProfile={(user) => {
          setIsDetailsModalOpen(false);
          handleEditProfile(user);
        }}
        onAssignRole={(user) => {
          setIsDetailsModalOpen(false);
          handleEditRole(user);
        }}
        onStatusChange={async (targetUser, newStatus) => {
          await handleStatusChange(targetUser.id, newStatus);
        }}
      />

      {/* Edit User Profile Modal (Superadmin Edit) */}
      <EditUserProfileModal
        isOpen={isEditProfileModalOpen}
        user={userToEdit}
        onClose={() => {
          setIsEditProfileModalOpen(false);
          setUserToEdit(null);
        }}
        onSave={handleSaveUserProfile}
        templesList={templesList}
        centersList={centersList}
        counselorsList={counselorsList}
      />

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
