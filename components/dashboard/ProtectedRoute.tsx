'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Loader2, Flower } from 'lucide-react';
import Image from 'next/image';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      if (!userData) {
        router.push('/auth/complete-registration');
        return;
      }

      // 1. Strict verification status checks
      if (userData?.verificationStatus === 'pending') {
        router.push('/auth/pending');
        return;
      } 
      
      if (userData?.verificationStatus !== 'approved') {
        router.push('/auth/complete-registration');
        return;
      }

      // 2. Mandatory profile completion check (15 days grace period)
      // Exception: Allow access to profile itself and donations page
      const isAllowedPath = pathname === '/dashboard/profile' || pathname === '/dashboard/donations';
      
      if (userData.createdAt && !isAllowedPath) {
        const createdAt = new Date(userData.createdAt);
        const now = new Date();
        const diffInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        
        if (diffInDays >= 15) {
          // Check if profile is incomplete
          const campFields = [
            'campDys', 'campSankalpa', 'campSphurti', 'campUtkarsh', 'campSrcgdWorkshop',
            'campNishtha', 'campFtec', 'campAshraya', 'campMtec', 'campSharanagati',
            'campIdc', 'campBhaktiShastri', 'campPositiveThinker', 'campSelfManager', 'campProactiveLeader'
          ];
          const hasAnyCamp = campFields.some(field => (userData as any)[field]);
          const hasAnyBook = Object.keys(userData).some(key => key.startsWith('spbook') && (userData as any)[key]);
          
          const isIncomplete = !userData.profileImage || 
                             !userData.aadharCardImage || 
                             !userData.hierarchy?.initiationStatus || 
                             !userData.hierarchy?.ashram || 
                             (userData.hierarchy?.rounds === null || userData.hierarchy?.rounds === undefined) || 
                             !userData.hierarchy?.counselor ||
                             !hasAnyCamp || 
                             !hasAnyBook;

          if (isIncomplete) {
            console.log('Redirecting to profile: Account > 15 days and profile incomplete');
            router.push('/dashboard/profile');
          }
        }
      }
    }
  }, [user, userData, loading, router, pathname]);

  // Helper precise loading UI to avoid repetition
  const LoadingScreen = ({ message }: { message: string }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-600 via-orange-600 to-red-600">
      <div className="absolute inset-0 opacity-10 mix-blend-overlay"></div>

      <div className="relative z-10 p-8 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-sm w-full mx-4 text-center transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="bg-white/20 p-3 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center backdrop-blur-sm shadow-inner">
          <Flower className="w-8 h-8 text-white animate-spin-slow" />
        </div>

        <h2 className="text-2xl font-serif font-bold text-white mb-2">VOICE Gurukul</h2>

        <div className="flex items-center justify-center gap-3 text-orange-50 font-medium bg-black/10 py-2 px-4 rounded-full w-fit mx-auto mt-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{message}</span>
        </div>

        <p className="text-orange-100 text-sm mt-6 opacity-80">
          Securely accessing your dashboard
        </p>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingScreen message="Verifying your profile..." />;
  }

  // Block access if no user - show loading while redirect happens
  if (!user) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // Block access if user exists but no profile data
  if (!userData) {
    return <LoadingScreen message="Redirecting to registration..." />;
  }

  // Block access if verification is pending - show loading while redirect happens
  if (userData?.verificationStatus === 'pending') {
    return <LoadingScreen message="Redirecting to pending status..." />;
  }

  // Block access if not approved (incomplete, unverified, rejected, etc.)
  if (userData?.verificationStatus !== 'approved') {
    return <LoadingScreen message="Redirecting to registration..." />;
  }

  return <>{children}</>;
}
