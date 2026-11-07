'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X, User as UserIcon, Mail, Phone, Calendar, Landmark, Building2,
  Users, Sparkles, Shield, GraduationCap, Briefcase, Heart, CheckCircle2,
  Clock, AlertTriangle, ExternalLink, MessageCircle, Pencil, Crown, Award,
  MapPin, Check
} from 'lucide-react';
import { User, UserRole } from '@/types';
import { getRoleDisplayName, getHighestRole } from '@/lib/utils/roles';
import { getSmallThumbnailUrl } from '@/lib/utils/google-drive';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onEditProfile: (user: User) => void;
  onAssignRole: (user: User) => void;
  onStatusChange?: (user: User, newStatus: 'approved' | 'pending' | 'rejected') => Promise<void>;
}

export default function UserDetailsModal({
  isOpen,
  onClose,
  user,
  onEditProfile,
  onAssignRole,
  onStatusChange,
}: UserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'spiritual' | 'education' | 'camps'>('profile');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!isOpen || !user) return null;

  const hierarchy = user.hierarchy || {};
  const highestRole = getHighestRole(user.role || 'student');
  const roleName = getRoleDisplayName(highestRole);
  const isPending = user.verificationStatus === 'pending';
  const isApproved = user.verificationStatus === 'approved';
  const isRejected = user.verificationStatus === 'rejected';

  const userAshram = hierarchy.ashram || (user as any).ashram || '';
  const isBrahmachariOrGrihastha = userAshram === 'Brahmachari' || userAshram === 'Grihastha';

  // Resolved Center / Temple / Counselor with "Other" recognition
  const otherCenterText = user.otherCenter || hierarchy.otherCenter || (user as any).other_center;
  const rawCenter = hierarchy.currentCenter || hierarchy.center || user.currentCenter || user.parentCenter;
  const isOtherCenter = rawCenter === 'Other';
  const displayCenter = rawCenter === 'None'
    ? 'None'
    : isOtherCenter
      ? (otherCenterText ? `Other: ${otherCenterText}` : 'Other (Unspecified)')
      : (rawCenter || 'None / Not Assigned');

  const otherTempleText = user.otherTemple || hierarchy.otherTemple || (user as any).other_temple;
  const rawTemple = hierarchy.currentTemple || user.currentTemple || user.parentTemple;
  const isOtherTemple = rawTemple === 'Other';
  const displayTemple = rawTemple === 'None'
    ? 'None'
    : isOtherTemple
      ? (otherTempleText ? `Other: ${otherTempleText}` : 'Other (Unspecified)')
      : (rawTemple || 'None / Not Assigned');

  const otherCounselorText = user.otherCounselor || hierarchy.otherCounselor || (user as any).other_counselor;
  const rawCounselor = hierarchy.counselor || hierarchy.brahmachariCounselor || hierarchy.grihasthaCounselor;
  const isOtherCounselor = rawCounselor === 'Other';
  const displayCounselor = rawCounselor === 'None'
    ? 'None'
    : isOtherCounselor
      ? (otherCounselorText ? `Other: ${otherCounselorText}` : 'Other (Unspecified)')
      : (rawCounselor || 'None / No Counselor');

  // Camps list
  const campsList = [
    { key: 'campDys', name: 'DYS (Discover Yourself)' },
    { key: 'campSankalpa', name: 'Sankalpa' },
    { key: 'campSphurti', name: 'Sphurti' },
    { key: 'campUtkarsh', name: 'Utkarsh' },
    { key: 'campSrcgdWorkshop', name: 'SRCGD Workshop' },
    { key: 'campNishtha', name: 'Nishtha' },
    { key: 'campFtec', name: 'FTEC' },
    { key: 'campAshraya', name: 'Ashraya' },
    { key: 'campMtec', name: 'MTEC' },
    { key: 'campSharanagati', name: 'Sharanagati' },
    { key: 'campIdc', name: 'IDC' },
    { key: 'campBhaktiShastri', name: 'Bhakti Shastri' },
    { key: 'campPositiveThinker', name: 'Positive Thinker' },
    { key: 'campSelfManager', name: 'Self Manager' },
    { key: 'campProactiveLeader', name: 'Proactive Leader' },
  ];

  const completedCamps = campsList.filter(c => Boolean((user as any)[c.key]));

  const cleanPhone = (user.phone || '').replace(/[^0-9]/g, '');

  const handleQuickStatus = async (status: 'approved' | 'pending' | 'rejected') => {
    if (!onStatusChange) return;
    setIsUpdatingStatus(true);
    try {
      await onStatusChange(user, status);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-orange-50/70 via-white to-amber-50/40">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 pr-10">
            {/* Avatar */}
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-200 border-2 border-slate-200 shadow-sm flex items-center justify-center text-xl font-bold text-orange-700 overflow-hidden shrink-0">
              {user.profileImage ? (
                <Image
                  src={getSmallThumbnailUrl(user.profileImage) || ''}
                  alt={user.name || 'User'}
                  className="w-full h-full object-cover"
                  fill
                  unoptimized={true}
                />
              ) : (
                <span>{user.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>

            {/* Basic Identity */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                  {user.name || 'Unnamed User'}
                </h2>
                {hierarchy.initiatedName && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    Spiritual: {hierarchy.initiatedName}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200/80">
                  {roleName}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${isPending
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : isApproved
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                >
                  Status: {user.verificationStatus || 'Unknown'}
                </span>

                {user.createdAt && (
                  <span className="text-[11px] text-gray-400 font-medium">
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Contact & Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2">
              {user.phone && (
                <>
                  <a
                    href={`tel:${user.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors shadow-2xs"
                  >
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>Call {user.phone}</span>
                  </a>

                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-300 transition-colors shadow-2xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </>
              )}
              {user.email && (
                <a
                  href={`mailto:${user.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors shadow-2xs"
                >
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>{user.email}</span>
                </a>
              )}
            </div>

            {/* Quick Status Toggle */}
            {onStatusChange && (
              <div className="flex items-center gap-1.5">
                {isPending && (
                  <button
                    onClick={() => handleQuickStatus('approved')}
                    disabled={isUpdatingStatus}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve User</span>
                  </button>
                )}
                {!isPending && isApproved && (
                  <button
                    onClick={() => handleQuickStatus('pending')}
                    disabled={isUpdatingStatus}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[11px] font-bold transition-all"
                  >
                    Set Pending
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 gap-2 bg-white shrink-0">
          {[
            { id: 'profile', label: 'Overview & Organization', icon: UserIcon },
            { id: 'spiritual', label: 'Spiritual Details', icon: Sparkles },
            { id: 'education', label: 'Education & Career', icon: GraduationCap },
            { id: 'camps', label: `Camps (${completedCamps.length})`, icon: Award },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${isActive
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/70">
          {/* TAB 1: Profile & Organization */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Special Warning if Other/None was chosen */}
              {((!isBrahmachariOrGrihastha && (isOtherCenter || rawCenter === 'None')) || isOtherTemple || isOtherCounselor) && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Special Attention / Manual Review Required</span>
                  </div>
                  <div className="space-y-0.5 text-amber-800/90 pl-5">
                    {!isBrahmachariOrGrihastha && isOtherCenter && (
                      <p>• Selected <strong>Other Center</strong>: <span className="font-semibold underline">{otherCenterText || 'No text provided'}</span></p>
                    )}
                    {isOtherTemple && (
                      <p>• Selected <strong>Other Temple</strong>: <span className="font-semibold underline">{otherTempleText || 'No text provided'}</span></p>
                    )}
                    {isOtherCounselor && (
                      <p>• Selected <strong>Other Counselor</strong>: <span className="font-semibold underline">{otherCounselorText || 'No text provided'}</span></p>
                    )}
                    {!isBrahmachariOrGrihastha && rawCenter === 'None' && (
                      <p>• Center marked as <strong>None</strong></p>
                    )}
                  </div>
                </div>
              )}

              {/* Grid 1: Organization Allocation */}
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-orange-500" />
                  Center & Temple Hierarchy
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Current Temple</span>
                    <span className={`font-bold mt-0.5 block ${isOtherTemple ? 'text-amber-800' : 'text-gray-900'}`}>
                      {displayTemple}
                    </span>
                  </div>

                  {!isBrahmachariOrGrihastha && (
                    <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Current Center</span>
                      <span className={`font-bold mt-0.5 block ${isOtherCenter ? 'text-amber-800' : 'text-gray-900'}`}>
                        {displayCenter}
                      </span>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Parent Temple</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {hierarchy.parentTemple || user.parentTemple || 'Not Specified'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Parent Center</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {hierarchy.parentCenter || user.parentCenter || 'Not Specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid 2: Counselor & Sangha */}
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-orange-500" />
                  Counselor & Sangha Affiliation
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Counselor</span>
                    <span className={`font-bold mt-0.5 block ${isOtherCounselor ? 'text-amber-800' : 'text-gray-900'}`}>
                      {displayCounselor}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ashram</span>
                    <span className="font-bold text-slate-900 mt-0.5 block capitalize">
                      {hierarchy.ashram || user.ashram || 'Student'}
                    </span>
                  </div>

                  {hierarchy.bv_group && (
                    <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bhakti Vriksha / Youth Group</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {hierarchy.bv_group}
                      </span>
                    </div>
                  )}

                  {hierarchy.counselorGroup && (
                    <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Counselor Group</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {hierarchy.counselorGroup}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid 3: Personal Information */}
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-orange-500" />
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Date of Birth</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {user.birthDate || 'Not Provided'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">User ID</span>
                    <span className="font-mono text-[10px] text-gray-500 mt-0.5 block truncate" title={user.id}>
                      {user.id}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Roles</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {Array.isArray(user.role) ? user.role.map(r => getRoleDisplayName(r)).join(', ') : roleName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Relatives / Emergency Contacts */}
              {(user.relative1Name || user.relative2Name || user.healthChronicDisease) && (
                <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Emergency Contacts & Health
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {user.relative1Name && (
                      <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Relative 1 ({user.relative1Relationship || 'Family'})
                        </span>
                        <span className="font-bold text-slate-900 mt-0.5 block">
                          {user.relative1Name} • {user.relative1Phone}
                        </span>
                      </div>
                    )}

                    {user.relative2Name && (
                      <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Relative 2 ({user.relative2Relationship || 'Family'})
                        </span>
                        <span className="font-bold text-slate-900 mt-0.5 block">
                          {user.relative2Name} • {user.relative2Phone}
                        </span>
                      </div>
                    )}

                    {user.healthChronicDisease && (
                      <div className="sm:col-span-2 p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-rose-900">
                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Health Notes / Chronic Conditions</span>
                        <span className="font-medium mt-0.5 block">{user.healthChronicDisease}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Spiritual Journey */}
          {activeTab === 'spiritual' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Initiation & Practice
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Initiation Status</span>
                    <span className="font-bold text-slate-900 mt-0.5 block capitalize">
                      {hierarchy.initiationStatus || 'Not Initiated'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Initiated Spiritual Name</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {hierarchy.initiatedName || 'None'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Spiritual Master</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {hierarchy.spiritualMasterName || 'None'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Daily Japa Rounds</span>
                    <span className="font-bold text-orange-700 mt-0.5 block text-sm">
                      {hierarchy.rounds || '0'} Rounds
                    </span>
                  </div>

                  <div className="sm:col-span-2 p-3 bg-slate-50/90 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Introduced to Krishna Consciousness</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {hierarchy.introducedToKcIn || user.introducedToKcIn || 'Not Specified'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Education & Career */}
          {activeTab === 'education' && (
            <div className="space-y-4">
              {/* Education */}
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-orange-500" />
                  Education Details
                </h3>

                {user.education && user.education.length > 0 ? (
                  <div className="space-y-2">
                    {user.education.map((edu, idx) => (
                      <div key={idx} className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 text-xs">
                        <div className="font-bold text-gray-900">{edu.degreeBranch || 'Degree'}</div>
                        <div className="text-gray-600 mt-0.5">{edu.institution}</div>
                        {(edu.startYear || edu.endYear) && (
                          <div className="text-[10px] text-gray-400 mt-1">
                            {edu.startYear || ''} - {edu.endYear || 'Present'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No formal education entries recorded.</p>
                )}
              </div>

              {/* Work Experience */}
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-orange-500" />
                  Work Experience
                </h3>

                {user.workExperience && user.workExperience.length > 0 ? (
                  <div className="space-y-2">
                    {user.workExperience.map((work, idx) => (
                      <div key={idx} className="p-3 bg-slate-50/90 rounded-xl border border-slate-300 text-xs">
                        <div className="font-bold text-gray-900">{work.position}</div>
                        <div className="text-gray-600 mt-0.5">{work.company} • {work.location}</div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          {work.startDate ? work.startDate.split('T')[0] : ''} - {work.current ? 'Current' : (work.endDate ? work.endDate.split('T')[0] : 'N/A')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No work experience entries recorded.</p>
                )}
              </div>

              {/* Languages & Skills */}
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Languages & Skills
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Languages</span>
                    <div className="flex flex-wrap gap-1">
                      {user.languages && user.languages.length > 0 ? (
                        user.languages.map((l, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                            {l.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic">None specified</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Skills & Services</span>
                    <div className="flex flex-wrap gap-1">
                      {user.skills && user.skills.length > 0 ? (
                        user.skills.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md text-xs font-medium">
                            {s.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic">None specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Camps Completed */}
          {activeTab === 'camps' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-orange-500" />
                    Completed Courses & Retreats
                  </span>
                  <span className="text-orange-600 font-bold">{completedCamps.length} Completed</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {campsList.map(camp => {
                    const isDone = Boolean((user as any)[camp.key]);
                    return (
                      <div
                        key={camp.key}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${isDone
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                      >
                        <span>{camp.name}</span>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <span className="text-[10px] font-bold uppercase opacity-60">Pending</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500 font-medium">
            Superadmin Access: Full View
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onAssignRole(user);
              }}
              className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Assign Roles</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEditProfile(user);
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Full Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
