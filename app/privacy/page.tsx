'use client';

import React from 'react';
import LegalPoliciesView from '@/components/policies/LegalPoliciesView';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100/50 to-yellow-50 py-10 px-4 sm:px-6 lg:px-8">
      <LegalPoliciesView initialTab="privacy" isPublic={true} />
    </div>
  );
}
