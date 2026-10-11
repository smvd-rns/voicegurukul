'use client';

import React, { useEffect } from 'react';
import LegalPoliciesView from '@/components/policies/LegalPoliciesView';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard/policies?tab=legal&type=privacy');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100/50 to-yellow-50 py-10 px-4 sm:px-6 lg:px-8">
      <LegalPoliciesView initialTab="privacy" isPublic={true} />
    </div>
  );
}
