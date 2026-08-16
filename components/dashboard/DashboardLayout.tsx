'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { logout } from '@/lib/supabase/auth';
import { getRoleDisplayName, getHighestRole } from '@/lib/utils/roles';
import { Menu, X, Home, BarChart3, Users, Settings, LogOut, Upload, Building2, MapPin, UserCheck, CheckCircle2, UserCircle2, Briefcase, Mic, Globe, Radio, Shield, BookOpen, Calendar, CreditCard, MoreHorizontal, ShoppingBag, Database, Heart } from 'lucide-react';
import ProfileCompletionModal from '@/components/auth/ProfileCompletionModal';
import ProfileCreationLoadingModal from '@/components/auth/ProfileCreationLoadingModal';
import { getSmallThumbnailUrl } from '@/lib/utils/google-drive';
import { requestNotificationPermission, getNotificationPermission, isNotificationSupported } from '@/lib/utils/notifications';

import { useEventNotifications } from '@/hooks/useEventNotifications';
import { Bell, X as CloseIcon } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarImgError, setSidebarImgError] = useState(false);
  const [topbarImgError, setTopbarImgError] = useState(false);
  const { user, userData, loading } = useAuth();
   const router = useRouter();
   const pathname = usePathname();
   const [showProfileModal, setShowProfileModal] = useState(false);

   const { theme, themeName, setTheme } = useTheme();

   const themesList = [
     { id: 'chaitanya', name: 'Chaitanya', dot: 'bg-orange-500'  },
     { id: 'nitai',     name: 'Nitai',     dot: 'bg-blue-600'    },
     { id: 'varaha',    name: 'Varaha',    dot: 'bg-purple-700'  },
     { id: 'rama',      name: 'Rama',      dot: 'bg-emerald-600' },
     { id: 'radharani', name: 'Radharani', dot: 'bg-rose-600'    },
     { id: 'govinda',   name: 'Govinda',   dot: 'bg-slate-400'   },
     { id: 'yamuna',    name: 'Yamuna',    dot: 'bg-amber-700'   },
     { id: 'krishna',   name: 'Krishna',   dot: 'bg-gray-900 border border-white/40' },
   ] as const;

   // Physical Back Button Support for Mobile Menu
   useEffect(() => {
     const handleHashChange = () => {
       if (window.location.hash !== '#menu' && sidebarOpen) {
         setSidebarOpen(false);
       } else if (window.location.hash === '#menu' && !sidebarOpen) {
         setSidebarOpen(true);
       }
     };

     window.addEventListener('popstate', handleHashChange);
     return () => window.removeEventListener('popstate', handleHashChange);
   }, [sidebarOpen]);

   // Close menu when navigating to a new page
   useEffect(() => {
     setSidebarOpen(false);
   }, [pathname]);

  const [showNotificationBanner, setShowNotificationBanner] = useState(false);


  // Enable event (announcement) notifications
  useEventNotifications();

  // Check if profile is incomplete - use new required fields
  // Required fields: state, city, center, initiationStatus, ashram, brahmachariCounselor
  const isProfileComplete = userData?.hierarchy?.state &&
    userData?.hierarchy?.city &&
    userData?.hierarchy?.center &&
    userData?.hierarchy?.initiationStatus &&
    userData?.hierarchy?.ashram &&
    userData?.hierarchy?.brahmachariCounselor;

  const showLoadingModal = !loading && user && !userData;

  // Disable the profile completion modal - we use the complete-profile page instead
  useEffect(() => {
    setShowProfileModal(false);

    // If profile is incomplete and user is authenticated, redirect to complete-profile page
    // This is handled by the callback page, but we can add a check here as a fallback
    if (!loading && user && userData && !isProfileComplete) {
      // Don't redirect here - let the callback page handle it
      // Just ensure the modal doesn't show
    }
  }, [userData, loading, user, isProfileComplete]);




  // Check notification permission on mount
  useEffect(() => {
    if (isNotificationSupported() && getNotificationPermission() === 'default') {
      // Show banner to request permission after 3 seconds
      const timer = setTimeout(() => {
        setShowNotificationBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setShowNotificationBanner(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all local storage to ensure no auth tokens persist
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
      }

      // Force a full page reload to ensure all auth state is cleared and prevent
      // the login page from redirecting back to dashboard due to stale state
      window.location.href = '/auth/login';
    }
  };

  // Compute navigation based on user roles (using useMemo to avoid render-time mutations)
  const navigation = useMemo(() => {
    const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
    const hasStudentOnly = userRoles.length === 1 && userRoles[0] === 'student';
    const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes(8 as any);
    const isLeadership = userRoles.includes('president') || userRoles.includes(10 as any) ||
      userRoles.includes('vice_president') || userRoles.includes(9 as any);
    const hasOrgViewAccess = isSuperAdmin || isLeadership;

    // Check if user has counselor role
    const hasCounselorRole = userRoles.includes('counselor') || userRoles.includes(2) ||
      userRoles.includes('care_giver') || userRoles.includes(20);

    // Check if user has voice_manager role (role 3)
    const hasVoiceManagerRole = userRoles.includes('voice_manager') || userRoles.includes('senior_counselor') || userRoles.includes(3);

    // Check if user has bc_voice_manager role (role 4)
    const hasBCVoiceManagerRole = userRoles.includes('bc_voice_manager') || userRoles.includes(4);

    // Check if user has city_admin role (role 5)
    const hasCityAdminRole = userRoles.includes('city_admin') || userRoles.includes(5);

    // Check if user has state_admin role (role 6)
    const hasStateAdminRole = userRoles.includes('state_admin') || userRoles.includes(6);

    // Check if user has zonal_admin role (role 7)
    const hasZonalAdminRole = userRoles.includes('zonal_admin') || userRoles.includes(7);

    // Check if user has any admin role
    const isAdmin = userRoles.some(role =>
      (typeof role === 'string' && ['super_admin', 'zonal_admin', 'state_admin', 'city_admin', 'center_admin', 'bc_voice_manager'].includes(role)) ||
      (typeof role === 'number' && role >= 4 && role <= 8)
    );

    const baseNavigation = [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Sadhana', href: '/dashboard/sadhana', icon: BookOpen },
      { name: 'Communications', href: '/dashboard/events', icon: Calendar },
      { name: 'Data Center', href: '/dashboard/data-center', icon: Globe },
      { name: 'Policies', href: '/dashboard/policies', icon: BookOpen },
      { name: 'Donations', href: '/dashboard/donations', icon: CreditCard },
      { name: 'Profile', href: '/dashboard/profile', icon: Settings },
    ];

    // Users link moved to Admin Dashboard
    // if (isSuperAdmin || hasBCVoiceManagerRole) {
    //   baseNavigation.push({ name: 'Users', href: '/dashboard/users', icon: Users });
    // }

    // Add Voice Manager page if user has voice_manager role (role 3)
    if (hasVoiceManagerRole) {
      baseNavigation.push({ name: 'Voice Manager', href: '/dashboard/voice-manager', icon: Mic });
    }

    // Add counselor page if user has counselor role
    // For Super Admins, this is accessed via Admin Dashboard, so hide it here
    if (hasCounselorRole && !isSuperAdmin) {
      baseNavigation.push({ name: 'Counselor', href: '/dashboard/counselor', icon: UserCheck });
    }



    // Add City Manager page if user has city_admin role (role 5)
    if (hasCityAdminRole) {
      baseNavigation.push({ name: 'City Manager', href: '/dashboard/city-manager', icon: Building2 });
    }

    // Add State Manager page if user has state_admin role (role 6)
    if (hasStateAdminRole) {
      baseNavigation.push({ name: 'State Manager', href: '/dashboard/state-manager', icon: MapPin });
    }

    // Add Zone Manager page if user has zonal_admin role (role 7)
    if (hasZonalAdminRole) {
      baseNavigation.push({ name: 'Zone Manager', href: '/dashboard/zone-manager', icon: MapPin });
    }

    // Add Managing Director Dashboard (Role 11, 12, 13, 21)
    const isManagingDirector = userRoles.some(r =>
      [11, 12, 13, 21].includes(Number(r)) ||
      ['managing_director', 'director', 'central_voice_manager', 'youth_preacher'].includes(String(r))
    );
    if (isManagingDirector) {
      baseNavigation.push({ name: 'Managing Director', href: '/dashboard/managing-director', icon: Briefcase });
    }

    // Add Project Manager Dashboard (Role 14, 15, 16)
    const isProjectManager = userRoles.some(r =>
      [14, 15, 16].includes(Number(r)) ||
      ['project_advisor', 'project_manager', 'acting_manager'].includes(String(r))
    );
    if (isProjectManager) {
      baseNavigation.push({ name: 'Project Manager', href: '/dashboard/project-manager', icon: Briefcase });
    }

    // Add Admin Dashboard if user is any admin (except super admin who has it already, handled separately?)
    // Usually Super Admin uses /dashboard/admin. 
    // Managing Director is using /dashboard/managing-director.

    // Check for admin dashboard access
    if (isSuperAdmin || hasBCVoiceManagerRole) {
      // ... existing logic ...
    }
    if (hasZonalAdminRole) {
      baseNavigation.push({ name: 'Zone Manager', href: '/dashboard/zone-manager', icon: Globe });
    }



    // Organization View -> ONLY for Leadership (President/VP), NOT for Super Admin (they access via Admin Dashboard)
    if (isLeadership) {
      baseNavigation.push({ name: 'Organization View', href: '/dashboard/president', icon: BarChart3 });
    }

    if (isSuperAdmin) {
      baseNavigation.push({ name: 'Admin', href: '/dashboard/admin', icon: Shield });
    }

    return baseNavigation;
  }, [userData]);

  return (
    <div className="t-page-bg h-screen flex overflow-hidden transition-colors duration-500">
      {/* Profile Creation Loading Modal */}
      <ProfileCreationLoadingModal isOpen={!!showLoadingModal} />

      {/* Profile Completion Modal */}
      {showProfileModal && !isProfileComplete && !showLoadingModal && (
        <ProfileCompletionModal
          isOpen={showProfileModal}
          onComplete={() => {
            setShowProfileModal(false);
            // The modal will reload the page after completion
          }}
        />
      )}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
          onClick={() => {
            if (window.location.hash === '#menu') {
              window.history.back();
            } else {
              setSidebarOpen(false);
            }
          }}
        />
      )}

      {/* Sidebar / More Menu */}
      <div
        className={`fixed z-30 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] 
          t-sidebar-gradient shadow-2xl lg:shadow-none
          w-72 lg:w-80
          bottom-[88px] lg:bottom-0 lg:top-0 right-0 lg:left-0
          max-h-[calc(100vh-140px)] lg:max-h-none lg:h-screen
          ${sidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 lg:opacity-100 lg:translate-x-0'} 
          lg:static lg:block lg:translate-x-0 lg:border-r lg:border-white/10
          rounded-t-[2.5rem] lg:rounded-none
          ${!sidebarOpen ? 'pointer-events-none lg:pointer-events-auto' : 'pointer-events-auto'}
          flex flex-col
        `}
      >
        <div className="flex flex-col h-full relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-white/10 flex-shrink-0 relative z-10 bg-transparent lg:rounded-none rounded-tl-[2rem]">
            <div className="flex items-center space-x-3">
              <h1 className="text-lg font-extrabold text-white font-display tracking-wider uppercase">
                Menu
              </h1>
            </div>
             <button
               onClick={() => {
                 if (window.location.hash === '#menu') {
                   window.history.back();
                 } else {
                   setSidebarOpen(false);
                 }
               }}
               className="lg:hidden text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
             >
               <X className="h-6 w-6" />
             </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-4 relative z-10">
            <nav className="space-y-1">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const isMobileHidden = ['Dashboard', 'Sadhana', 'Communications', 'Data Center', 'Donations'].includes(item.name);
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group items-center px-4 py-2.5 lg:px-5 lg:py-3.5 rounded-xl lg:rounded-none transition-all duration-200 ${isMobileHidden ? 'hidden lg:flex' : 'flex'} ${isActive ? 'bg-white/20 text-white font-bold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="relative z-10 flex items-center w-full">
                      <div className={`p-1.5 rounded-lg transition-all duration-200 ${isActive ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/15'}`}>
                        <Icon className={`h-4 w-4 lg:h-5 lg:w-5 transition-colors duration-200 ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`} />
                      </div>
                      <span className="ml-4 font-bold text-[10px] lg:text-[11.5px] tracking-widest uppercase font-sans">
                        {item.name}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Theme Selector Dropdown */}
          <div className="px-5 py-3 border-t border-white/10 bg-black/15 relative z-10 lg:px-4 lg:py-2.5">
            <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase block mb-1.5">
              Theme
            </span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-white/40 cursor-pointer"
            >
              {themesList.map((t) => (
                <option key={t.id} value={t.id} className="text-gray-900 bg-white font-sans">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* User Profile Section */}
          <div className="border-t border-white/10 p-4 lg:p-3 flex-shrink-0 relative z-10 bg-black/25">
            <div className="flex items-center mb-3 lg:mb-2 p-3 lg:p-2 bg-white/10 rounded-xl shadow-sm border border-white/10">
              <div className="mr-3 lg:mr-2.5 flex-shrink-0">
                <div className="relative">
                  {userData?.profileImage && !sidebarImgError ? (
                    <Image
                      src={getSmallThumbnailUrl(userData.profileImage) || userData.profileImage}
                      alt={userData.name || 'Profile'}
                      width={32}
                      height={32}
                      className="relative w-8 h-8 rounded-full object-cover border-2 border-white/20 shadow-sm"
                      unoptimized={true}
                      onError={() => setSidebarImgError(true)}
                    />
                  ) : (
                    <div className="relative w-8 h-8 rounded-full bg-white/15 border-2 border-white/20 shadow-sm flex items-center justify-center">
                      <UserCircle2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate uppercase tracking-tight">
                  {userData?.name}
                </p>
                <p className="text-[9px] text-white/60 font-medium truncate uppercase">
                  {getRoleDisplayName(getHighestRole(userData?.role || 'student'))}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="group flex items-center justify-center w-full px-4 py-2.5 lg:py-2 text-white/60 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all duration-200 font-bold text-[10px] uppercase tracking-widest"
            >
              <LogOut className="h-3.5 w-3.5 mr-2.5 text-white/60 group-hover:text-red-400 transition-colors" />
              <span>Logout Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md shadow-sm h-16 flex items-center px-4 lg:px-8 flex-shrink-0 border-b border-gray-200/60 justify-between">
          <div className="flex items-center gap-3">
            <span className="lg:hidden font-display font-bold text-lg t-text-accent transition-colors duration-500">
              VOICE Gurukul
            </span>
          </div>

          <div className="flex-1 lg:block hidden" />

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* User Profile */}
            <div className="flex items-center gap-2 lg:gap-2.5 px-2 py-1.5 lg:px-3 lg:py-2 t-bg-light rounded-lg transition-all duration-200 border t-border">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-sm opacity-30"></div>
                {userData?.profileImage && !topbarImgError ? (
                  <Image
                    src={getSmallThumbnailUrl(userData.profileImage) || userData.profileImage}
                    alt={userData.name || 'Profile'}
                    width={32}
                    height={32}
                    className="relative w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                    unoptimized={true}
                    onError={() => setTopbarImgError(true)}
                  />
                ) : (
                  <div className="relative w-8 h-8 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center">
                    <UserCircle2 className="w-5 h-5 t-text-accent" />
                  </div>
                )}
              </div>
              <div className="hidden sm:flex flex-col">
                <p className="text-sm font-semibold text-gray-800 leading-tight max-w-[100px] truncate">
                  {userData?.name}
                </p>
                <p className="text-xs text-gray-500 leading-tight">
                  {getRoleDisplayName(getHighestRole(userData?.role || 'student'))}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="group flex items-center justify-center lg:gap-2 w-10 h-10 lg:w-auto lg:h-auto lg:px-3 lg:py-2 text-red-600 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg transition-all duration-200 font-medium border border-red-100 hover:border-red-500 hover:shadow-md"
              title="Logout"
            >
              <LogOut className="h-5 w-5 lg:h-4 lg:w-4 group-hover:rotate-12 transition-transform duration-200" />
              <span className="hidden lg:inline text-sm">Logout</span>
            </button>
          </div>
        </div>

        {/* Notification Permission Banner */}
        {showNotificationBanner && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl shadow-2xl p-4 animate-in slide-in-from-top duration-300">
              <div className="flex items-start gap-3">
                <Bell className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Enable Notifications</h3>
                  <p className="text-sm text-blue-50 mb-3">
                    Get instant notifications when you receive new messages, just like WhatsApp!
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEnableNotifications}
                      className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm"
                    >
                      Enable
                    </button>
                    <button
                      onClick={() => setShowNotificationBanner(false)}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg font-semibold transition-colors text-sm"
                    >
                      Later
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotificationBanner(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 pb-32 lg:p-6 lg:pb-8 xl:p-8 overflow-y-auto">{children}</main>

        {/* Mobile Bottom Navigation */}
        <div className="t-gradient lg:hidden fixed bottom-0 left-0 right-0 shadow-2xl z-40 px-1 pb-2 pb-safe border-t border-white/10 transition-all duration-500">
          <div className="flex justify-around items-center h-20">
            <Link 
              href="/dashboard" 
              className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${pathname === '/dashboard' ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/60 hover:text-white'}`}
            >
              <Home className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium">Home</span>
            </Link>
            <Link 
              href="/dashboard/sadhana" 
              className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${pathname === '/dashboard/sadhana' ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/60 hover:text-white'}`}
            >
              <BookOpen className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium">Sadhana</span>
            </Link>
            <Link 
              href="/dashboard/events" 
              className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${pathname === '/dashboard/events' ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/60 hover:text-white'}`}
            >
              <Bell className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium">Connect</span>
            </Link>
            <Link 
              href="/dashboard/data-center" 
              className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${pathname === '/dashboard/data-center' ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/60 hover:text-white'}`}
            >
              <Database className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium">Data</span>
            </Link>
            <Link 
              href="/dashboard/donations" 
              className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${pathname === '/dashboard/donations' ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/60 hover:text-white'}`}
            >
              <Heart className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium">Donate</span>
            </Link>
             <button 
               onClick={() => {
                 if (!sidebarOpen) {
                   window.location.hash = 'menu';
                 } else {
                   if (window.location.hash === '#menu') {
                     window.history.back();
                   } else {
                     setSidebarOpen(false);
                   }
                 }
               }}
               className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${sidebarOpen ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/60 hover:text-white'}`}
             >
               <MoreHorizontal className="h-5 w-5 mb-1" />
               <span className="text-[10px] font-medium">More</span>
             </button>
          </div>
        </div>


      </div>
    </div>
  );
}
