'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, FileText, RefreshCw, ArrowLeft, CheckCircle2, Lock, HelpCircle, Phone, Mail } from 'lucide-react';

export type PolicyTab = 'terms' | 'privacy' | 'refund';

interface LegalPoliciesViewProps {
  initialTab?: PolicyTab;
  isPublic?: boolean;
  onTabChange?: (tab: PolicyTab) => void;
}

export default function LegalPoliciesView({ initialTab = 'terms', isPublic = false, onTabChange }: LegalPoliciesViewProps) {
  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabClick = (tab: PolicyTab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header for Public Pages */}
      {isPublic && (
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors bg-orange-50 px-4 py-2 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            ISKCON NVCC Pune &bull; Legal &amp; Policies
          </span>
        </div>
      )}

      {/* Policy Selector Navigation Bar */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-2 border border-gray-200/80 shadow-sm flex flex-wrap gap-2">
        <button
          onClick={() => handleTabClick('terms')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'terms'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Terms &amp; Conditions
        </button>

        <button
          onClick={() => handleTabClick('privacy')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'privacy'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          Privacy Policy
        </button>

        <button
          onClick={() => handleTabClick('refund')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'refund'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Refund Policy
        </button>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xl space-y-8">
        {/* TAB 1: TERMS & CONDITIONS */}
        {activeTab === 'terms' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-gray-100 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider mb-3">
                <FileText className="w-3.5 h-3.5" /> Agreement
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Terms &amp; Conditions
              </h1>
              <p className="text-xs text-gray-400 font-medium mt-1">
                Last Updated: October 9, 2026 &bull; ISKCON NVCC Pune / VOICE Gurukul
              </p>
            </div>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-orange-500" />
                1. Acceptance of Terms
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                By accessing, registering, or using <strong>VOICE Gurukul</strong> (website or mobile application) operated by <strong>ISKCON NVCC Pune</strong>, you acknowledge that you have read, understood, and agree to be bound by these Terms &amp; Conditions.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-orange-500" />
                2. User Account &amp; Conduct
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Users are required to maintain accurate profile details and safeguard login credentials. VOICE Gurukul is a dedicated platform for spiritual education, sadhana tracking, youth mentorship, camp registrations, and devotional service.
              </p>
              <ul className="list-disc pl-6 text-sm text-gray-600 space-y-1">
                <li>Provide accurate personal registration details (Name, Email, Phone, Age, Gender).</li>
                <li>Respect spiritual guidelines and community decorum.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-orange-500" />
                3. Payments &amp; Online Gateway
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                All online transactions, camp registrations, and voluntary contributions are processed securely via <strong>Razorpay</strong>. We do not store credit card or sensitive payment details on our servers. Prices and contributions are denominated in Indian Rupees (INR).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-orange-500" />
                4. Intellectual Property
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                All publications, audio recordings, lecture materials, and software elements are the property of ISKCON NVCC Pune. Reproduction without prior written consent is strictly prohibited.
              </p>
            </section>

            <section className="space-y-3 border-t border-gray-100 pt-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-orange-500" />
                5. Contact Us
              </h2>
              <p className="text-sm text-gray-600">
                If you have any questions about this Terms &amp; Conditions policy, please contact us at:
              </p>
              <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-100 space-y-2 text-sm text-gray-800 font-medium">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-600" />
                  <span><strong>Email:</strong> manager@voicepune.com</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-600" />
                  <span><strong>Phone:</strong> +91 73787 09688</span>
                </p>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: PRIVACY POLICY */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-gray-100 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
                <Lock className="w-3.5 h-3.5" /> Privacy &amp; Data Security
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Privacy Policy
              </h1>
              <p className="text-xs text-gray-400 font-medium mt-1">
                Last Updated: October 9, 2026
              </p>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed font-medium">
              Your privacy is important to us. This policy explains how we collect, use, and protect your information at <strong>ISKCON NVCC Pune</strong>.
            </p>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                1. Information We Collect
              </h2>
              <ul className="list-disc pl-6 text-sm text-gray-600 space-y-2">
                <li>
                  <strong>Personal Information:</strong> Name, Email, Phone, Age, Gender, and Spiritual preferences when you register.
                </li>
                <li>
                  <strong>Payment Information:</strong> Processed securely via Razorpay; we do not store credit card details on our servers.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                2. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 text-sm text-gray-600 space-y-2">
                <li>To process camp registrations and accommodation allocation.</li>
                <li>To improve our devotee care and services.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                3. Data Security
              </h2>
              <ul className="list-disc pl-6 text-sm text-gray-600 space-y-2">
                <li>We use industry-standard security measures to protect your data.</li>
                <li>We strictly do not sell or share your personal information with third parties.</li>
              </ul>
            </section>

            <section className="space-y-3 border-t border-gray-100 pt-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                4. Contact Us
              </h2>
              <p className="text-sm text-gray-600">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-2 text-sm text-gray-800 font-medium">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span><strong>Email:</strong> manager@voicepune.com</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span><strong>Phone:</strong> +91 73787 09688</span>
                </p>
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: REFUND POLICY */}
        {activeTab === 'refund' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-gray-100 pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
                <RefreshCw className="w-3.5 h-3.5" /> Contributions &amp; Returns
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Refund &amp; Cancellation Policy
              </h1>
              <p className="text-xs text-gray-400 font-medium mt-1">
                Last Updated: October 9, 2026 &bull; ISKCON NVCC Pune
              </p>
            </div>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                1. Voluntary Donations &amp; Seva Contributions
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                All financial contributions and donations made to <strong>ISKCON NVCC Pune</strong> (VOICE Gurukul) are voluntary offerings toward spiritual, educational, and community welfare activities. Voluntary donations are generally non-refundable once processed.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                2. Camp Registrations &amp; Event Accommodation
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                For paid camp registrations, youth retreats, or specialized workshops:
              </p>
              <ul className="list-disc pl-6 text-sm text-gray-600 space-y-1">
                <li><strong>Cancellations 48+ hours prior:</strong> Eligible for a 100% refund or transfer to a future event.</li>
                <li><strong>Cancellations within 48 hours:</strong> Partial refund depending on accommodation booking commitments.</li>
                <li><strong>Event Cancellation by Organizer:</strong> Full 100% refund will be issued promptly.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                3. Refund Processing Timeline
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Approved refunds or accidental duplicate payment transactions will be credited back to the customer&apos;s original payment method via Razorpay within <strong>5 to 7 business days</strong>.
              </p>
            </section>

            <section className="space-y-3 border-t border-gray-100 pt-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-500" />
                4. Contact Us for Refund Inquiries
              </h2>
              <p className="text-sm text-gray-600">
                If you have any questions or require assistance with payment verification and refunds, please contact us at:
              </p>
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-2 text-sm text-gray-800 font-medium">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span><strong>Email:</strong> manager@voicepune.com</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span><strong>Phone:</strong> +91 73787 09688</span>
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
