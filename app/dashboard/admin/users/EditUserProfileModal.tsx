'use client';

import React, { useState, useEffect } from 'react';
import {
  X, User as UserIcon, Mail, Phone, Calendar, Landmark, Building2,
  Users, Sparkles, Check, Loader2, Award, AlertCircle, Plus,
  Receipt, ShieldCheck
} from 'lucide-react';
import { User, TempleData } from '@/types';
import { CenterData, addCenterToSupabase } from '@/lib/supabase/centers';
import { CounselorData } from '@/lib/supabase/counselors';
import { addTempleToSupabase } from '@/lib/supabase/temples';
import { SPIRITUAL_MASTERS } from '@/lib/utils/spiritual-masters';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { validatePhoneNumber } from '@/lib/utils/phone-validation';
import { toast } from 'react-hot-toast';

interface EditUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, updatedData: Partial<User>) => Promise<void>;
  user: User | null;
  templesList: TempleData[];
  centersList: CenterData[];
  counselorsList: CounselorData[];
  onRefreshData?: () => Promise<void>;
}

const ASHRAM_OPTIONS = [
  { value: 'Student and Not decided', label: 'Student and Not decided' },
  { value: 'Working and Not Decided', label: 'Working and Not Decided' },
  { value: 'Gauranga Sabha', label: 'Gauranga Sabha' },
  { value: 'Nityananda Sabha', label: 'Nityananda Sabha' },
  { value: 'Grihastha', label: 'Grihastha' },
  { value: 'Brahmachari', label: 'Brahmachari' },
  { value: 'Staying Single (Not planning to marry)', label: 'Staying Single (Not planning to marry)' },
];

const CAMPS_LIST = [
  { key: 'campDys', label: 'DYS (Discover Yourself)' },
  { key: 'campSankalpa', label: 'Sankalpa' },
  { key: 'campSphurti', label: 'Sphurti' },
  { key: 'campUtkarsh', label: 'Utkarsh' },
  { key: 'campSrcgdWorkshop', label: 'SRCGD Workshop' },
  { key: 'campNishtha', label: 'Nishtha' },
  { key: 'campFtec', label: 'FTEC' },
  { key: 'campAshraya', label: 'Ashraya' },
  { key: 'campMtec', label: 'MTEC' },
  { key: 'campSharanagati', label: 'Sharanagati' },
  { key: 'campIdc', label: 'IDC' },
  { key: 'campBhaktiShastri', label: 'Bhakti Shastri' },
  { key: 'campPositiveThinker', label: 'Positive Thinker' },
  { key: 'campSelfManager', label: 'Self Manager' },
  { key: 'campProactiveLeader', label: 'Proactive Leader' },
];

export default function EditUserProfileModal({
  isOpen,
  onClose,
  onSave,
  user,
  templesList,
  centersList,
  counselorsList,
  onRefreshData
}: EditUserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'hierarchy' | 'spiritual' | 'camps'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [isRegisteringCenter, setIsRegisteringCenter] = useState(false);
  const [isRegisteringTemple, setIsRegisteringTemple] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    ashram: 'Student',
    verificationStatus: 'approved' as 'approved' | 'pending' | 'rejected',
    currentTemple: '',
    otherTemple: '',
    currentCenter: '',
    otherCenter: '',
    parentTemple: '',
    parentCenter: '',
    counselor: '',
    otherCounselor: '',
    counselorId: '',
    initiationStatus: '' as 'initiated' | 'aspiring' | '',
    initiatedName: '',
    spiritualMasterName: '',
    introducedToKcIn: '',
    rounds: '',
    canViewAllDonations: false,
    camps: {} as Record<string, boolean>
  });

  useEffect(() => {
    if (user) {
      const hierarchy = user.hierarchy || {};
      const userOtherCenter = user.otherCenter || hierarchy.otherCenter || (user as any).other_center || '';
      const userOtherTemple = user.otherTemple || hierarchy.otherTemple || (user as any).other_temple || '';
      const userOtherCounselor = user.otherCounselor || hierarchy.otherCounselor || (user as any).other_counselor || '';

      const rawCurrentCenter = hierarchy.currentCenter || hierarchy.center || user.currentCenter || '';
      const rawCurrentTemple = hierarchy.currentTemple || user.currentTemple || '';
      const rawCounselor = hierarchy.counselor || hierarchy.brahmachariCounselor || hierarchy.grihasthaCounselor || '';

      const currentTempleVal = rawCurrentTemple === 'None'
        ? 'None'
        : (rawCurrentTemple === 'Other' ? 'Other' : (rawCurrentTemple || (userOtherTemple ? 'Other' : '')));
      const currentCenterVal = rawCurrentCenter === 'None'
        ? 'None'
        : (rawCurrentCenter === 'Other' ? 'Other' : (rawCurrentCenter || (userOtherCenter ? 'Other' : '')));
      const counselorVal = rawCounselor === 'None'
        ? 'None'
        : (rawCounselor === 'Other' ? 'Other' : (rawCounselor || (userOtherCounselor ? 'Other' : '')));

      const effectiveOtherCenter = currentCenterVal === 'Other' ? userOtherCenter : '';
      const effectiveOtherTemple = currentTempleVal === 'Other' ? userOtherTemple : '';
      const effectiveOtherCounselor = counselorVal === 'Other' ? userOtherCounselor : '';

      const campsMap: Record<string, boolean> = {};
      CAMPS_LIST.forEach(c => {
        campsMap[c.key] = Boolean((user as any)[c.key]);
      });

      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        birthDate: user.birthDate ? String(user.birthDate).split('T')[0] : '',
        ashram: hierarchy.ashram || (user as any).ashram || 'Student',
        verificationStatus: (user.verificationStatus as any) || 'approved',
        currentTemple: currentTempleVal,
        otherTemple: effectiveOtherTemple,
        currentCenter: currentCenterVal,
        otherCenter: effectiveOtherCenter,
        parentTemple: hierarchy.parentTemple || user.parentTemple || '',
        parentCenter: hierarchy.parentCenter || user.parentCenter || '',
        counselor: counselorVal,
        otherCounselor: effectiveOtherCounselor,
        counselorId: hierarchy.counselorId || hierarchy.counselor_id || '',
        initiationStatus: (hierarchy.initiationStatus as any) || '',
        initiatedName: hierarchy.initiatedName || '',
        spiritualMasterName: hierarchy.spiritualMasterName || '',
        introducedToKcIn: hierarchy.introducedToKcIn || user.introducedToKcIn || '',
        rounds: hierarchy.rounds ? String(hierarchy.rounds) : '',
        canViewAllDonations: Boolean(user.canViewAllDonations || (user as any).can_view_all_donations || hierarchy.can_view_all_donations || hierarchy.canViewAllDonations),
        camps: campsMap
      });
      setActiveTab('basic');
      setError('');
    }
  }, [user]);

  // Find current temple object
  const currentTempleObj = React.useMemo(() => {
    if (!formData.currentTemple || formData.currentTemple === 'Other' || formData.currentTemple === 'None') return null;
    return templesList.find(
      t => t.name?.trim().toLowerCase() === formData.currentTemple.trim().toLowerCase() || t.id === formData.currentTemple
    );
  }, [templesList, formData.currentTemple]);

  // Available current centers strictly for selected current temple
  const availableCurrentCenters = React.useMemo(() => {
    if (!formData.currentTemple || formData.currentTemple === 'None' || formData.currentTemple === 'Other') return [];
    return centersList.filter(c => {
      if (currentTempleObj && c.temple_id && c.temple_id === currentTempleObj.id) return true;
      if (c.temple_id && c.temple_id === formData.currentTemple) return true;
      if (c.temple_name && c.temple_name.trim().toLowerCase() === formData.currentTemple.trim().toLowerCase()) return true;
      return false;
    });
  }, [centersList, formData.currentTemple, currentTempleObj]);

  // Searchable Select Options
  const currentTempleOptions = React.useMemo(() => [
    { id: '', name: 'None / Not Assigned' },
    { id: 'Other', name: '⚠️ Other (Custom Temple Name)' },
    ...templesList.map(t => ({
      id: t.name,
      name: t.name,
      email: t.city ? (t.state ? `${t.city}, ${t.state}` : t.city) : t.state || ''
    }))
  ], [templesList]);

  const currentCenterOptions = React.useMemo(() => {
    const opts: Array<{ id: string; name: string; email?: string }> = [
      { id: '', name: 'None / Not Assigned' },
      { id: 'Other', name: '⚠️ Other (Custom Center Name)' }
    ];

    if (formData.currentCenter && !availableCurrentCenters.some(c => c.name === formData.currentCenter) && formData.currentCenter !== 'Other') {
      opts.push({
        id: formData.currentCenter,
        name: `${formData.currentCenter} (Current)`,
        email: 'Previously Assigned'
      });
    }

    availableCurrentCenters.forEach(c => {
      opts.push({
        id: c.name,
        name: c.name,
        email: [c.temple_name, c.city].filter(Boolean).join(' • ')
      });
    });

    return opts;
  }, [availableCurrentCenters, formData.currentCenter]);

  const parentTempleOptions = React.useMemo(() => [
    { id: '', name: 'None / Not Specified' },
    ...templesList.map(t => ({
      id: t.name,
      name: t.name,
      email: t.city ? (t.state ? `${t.city}, ${t.state}` : t.city) : t.state || ''
    }))
  ], [templesList]);

  const parentCenterOptions = React.useMemo(() => [
    { id: '', name: 'None / Not Specified' },
    ...centersList.map(c => ({
      id: c.name,
      name: c.name,
      email: [c.temple_name, c.city].filter(Boolean).join(' • ')
    }))
  ], [centersList]);

  const counselorOptions = React.useMemo(() => {
    const list = [
      { id: '', name: 'None / No Counselor' },
      { id: 'Other', name: '⚠️ Other (Custom Counselor Name)' },
      ...counselorsList.map(c => ({
        id: c.name,
        name: c.name,
        email: [c.ashram, c.city, c.mobile, c.email].filter(Boolean).join(' • ')
      }))
    ];
    if (formData.counselor && !list.some(item => item.id === formData.counselor)) {
      list.push({
        id: formData.counselor,
        name: formData.counselor,
        email: 'Assigned Counselor'
      });
    }
    return list;
  }, [counselorsList, formData.counselor]);

  const spiritualMasterOptions = React.useMemo(() => [
    { id: '', name: 'Select Spiritual Master' },
    ...SPIRITUAL_MASTERS.map(sm => ({
      id: sm,
      name: sm
    }))
  ], []);

  const handleRegisterNewCenter = async () => {
    const centerName = formData.otherCenter.trim();
    if (!centerName) {
      setError('Please provide a name for the new center');
      return;
    }

    setIsRegisteringCenter(true);
    setError('');
    try {
      const state = currentTempleObj?.state || user?.hierarchy?.state || 'Maharashtra';
      const city = currentTempleObj?.city || user?.hierarchy?.city || 'Pune';
      const templeId = currentTempleObj?.id || undefined;
      const templeName = currentTempleObj?.name || (formData.currentTemple !== 'Other' ? formData.currentTemple : undefined);

      await addCenterToSupabase({
        name: centerName,
        state,
        city,
        temple_id: templeId,
        temple_name: templeName,
      });

      if (onRefreshData) {
        await onRefreshData();
      }

      setFormData(prev => ({
        ...prev,
        currentCenter: centerName,
        otherCenter: ''
      }));

      toast.success(`Center "${centerName}" created and assigned!`);
    } catch (err: any) {
      console.error('Failed to create center:', err);
      setError(err.message || 'Failed to create center');
    } finally {
      setIsRegisteringCenter(false);
    }
  };

  const handleRegisterNewTemple = async () => {
    const templeName = formData.otherTemple.trim();
    if (!templeName) {
      setError('Please provide a name for the new temple');
      return;
    }

    setIsRegisteringTemple(true);
    setError('');
    try {
      const state = user?.hierarchy?.state || 'Maharashtra';
      const city = user?.hierarchy?.city || 'Pune';

      await addTempleToSupabase({
        name: templeName,
        state,
        city,
      });

      if (onRefreshData) {
        await onRefreshData();
      }

      setFormData(prev => ({
        ...prev,
        currentTemple: templeName,
        otherTemple: ''
      }));

      toast.success(`Temple "${templeName}" created and assigned!`);
    } catch (err: any) {
      console.error('Failed to create temple:', err);
      setError(err.message || 'Failed to create temple');
    } finally {
      setIsRegisteringTemple(false);
    }
  };

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (formData.phone) {
      const phoneRes = validatePhoneNumber(formData.phone, '+91', false);
      if (!phoneRes.isValid) {
        setError(phoneRes.error || 'Please enter a valid phone number');
        return;
      }
    }

    if (formData.currentTemple === 'Other' && !formData.otherTemple.trim()) {
      setError('Please specify the name of the Other Temple or create it');
      return;
    }
    const isBrahmachariOrGrihastha = formData.ashram === 'Brahmachari' || formData.ashram === 'Grihastha';

    if (!isBrahmachariOrGrihastha && formData.currentCenter === 'Other' && !formData.otherCenter.trim()) {
      setError('Please specify the name of the Other Center or create it');
      return;
    }
    if (formData.counselor === 'Other' && !formData.otherCounselor.trim()) {
      setError('Please specify the name of the Other Counselor');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const resolvedTemple = formData.currentTemple === 'Other' ? 'Other' : (formData.currentTemple || null);
      const resolvedOtherTemple = formData.currentTemple === 'Other' ? formData.otherTemple.trim() : null;

      const resolvedCenter = isBrahmachariOrGrihastha
        ? null
        : (formData.currentCenter === 'Other' ? 'Other' : (formData.currentCenter || null));
      const resolvedOtherCenter = isBrahmachariOrGrihastha
        ? null
        : (formData.currentCenter === 'Other' ? formData.otherCenter.trim() : null);

      const resolvedCounselor = formData.counselor === 'Other' ? 'Other' : (formData.counselor || null);
      const resolvedOtherCounselor = formData.counselor === 'Other' ? formData.otherCounselor.trim() : null;

      const updatedHierarchy: any = {
        ...(user.hierarchy || {}),
        currentTemple: resolvedTemple,
        otherTemple: resolvedOtherTemple,
        currentCenter: resolvedCenter,
        center: resolvedCenter === 'Other' && resolvedOtherCenter ? resolvedOtherCenter : resolvedCenter,
        otherCenter: resolvedOtherCenter,
        parentTemple: formData.parentTemple || null,
        parentCenter: formData.parentCenter || null,
        counselor: resolvedCounselor,
        otherCounselor: resolvedOtherCounselor,
        counselorId: formData.counselorId || null,
        counselor_id: formData.counselorId || null,
        ashram: formData.ashram || 'Student',
        initiationStatus: formData.initiationStatus || null,
        initiatedName: formData.initiatedName || null,
        spiritualMasterName: formData.spiritualMasterName || null,
        introducedToKcIn: formData.introducedToKcIn || null,
        rounds: formData.rounds ? parseInt(formData.rounds) || null : null,
        can_view_all_donations: formData.canViewAllDonations
      };

        const payload: any = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          birthDate: formData.birthDate || undefined,
          verificationStatus: formData.verificationStatus as any,
          canViewAllDonations: formData.canViewAllDonations,
          can_view_all_donations: formData.canViewAllDonations,
          hierarchy: updatedHierarchy,
          currentTemple: resolvedTemple,
          otherTemple: resolvedOtherTemple,
          currentCenter: resolvedCenter,
          center: resolvedCenter === 'Other' && resolvedOtherCenter ? resolvedOtherCenter : resolvedCenter,
          otherCenter: resolvedOtherCenter,
          parentTemple: formData.parentTemple || null,
          parentCenter: formData.parentCenter || null,
          counselor: resolvedCounselor,
          counselorId: formData.counselorId || null,
          otherCounselor: resolvedOtherCounselor,
          ashram: formData.ashram || undefined,
          introducedToKcIn: formData.introducedToKcIn || undefined,
          ...formData.camps
        };

        await onSave(user.id, payload);
        onClose();
      } catch (err: any) {
        console.error('Error saving user profile:', err);
        setError(err.message || 'Failed to update user profile');
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Edit User Details Before Approval</h2>
              <p className="text-xs text-gray-500 font-medium">
                Allocate official temple, center, counselor or create new records for <span className="font-semibold text-gray-800">{user.name}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100 px-6 gap-2 bg-white shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('hierarchy')}
              className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'hierarchy'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Center, Temple & Counselor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'basic'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              General Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('spiritual')}
              className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'spiritual'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Spiritual Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('camps')}
              className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${activeTab === 'camps'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
            >
              <Award className="w-3.5 h-3.5" />
              Camps & Courses
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: Center, Temple & Counselor (Shown first so Superadmin can immediately allocate) */}
            {activeTab === 'hierarchy' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Current Temple */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Current Temple</label>
                    <SearchableSelect
                      options={currentTempleOptions}
                      value={formData.currentTemple}
                      valueProperty="id"
                      onChange={(val) => {
                        setFormData({
                          ...formData,
                          currentTemple: val,
                          otherTemple: val === 'Other' ? formData.otherTemple : '',
                          currentCenter: ''
                        });
                      }}
                      placeholder="None / Not Assigned"
                      searchPlaceholder="Search temple by name, city, state..."
                      icon={<Landmark className="w-4 h-4 text-gray-400" />}
                      triggerClassName="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
                    />

                    {formData.currentTemple === 'Other' && (
                      <div className="mt-2 p-3 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-2">
                        <label className="block text-[11px] font-bold text-orange-900">Custom Temple Name</label>
                        <input
                          type="text"
                          required
                          value={formData.otherTemple}
                          onChange={e => setFormData({ ...formData, otherTemple: e.target.value })}
                          placeholder="e.g. ISKCON NVCC Pune"
                          className="w-full px-3 py-1.5 bg-white border border-orange-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-200"
                        />
                        {formData.otherTemple.trim() && (
                          <div className="pt-2 border-t border-orange-200/60 flex items-center justify-between gap-2">
                            <p className="text-[11px] text-orange-800">
                              Register as new official temple?
                            </p>
                            <button
                              type="button"
                              onClick={handleRegisterNewTemple}
                              disabled={isRegisteringTemple}
                              className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
                            >
                              {isRegisteringTemple ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                              <span>Create Temple</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Current Center - Not applicable for Brahmachari or Grihastha */}
                  {formData.ashram !== 'Brahmachari' && formData.ashram !== 'Grihastha' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Current Center</label>
                      <SearchableSelect
                        options={currentCenterOptions}
                        value={formData.currentCenter}
                        valueProperty="id"
                        onChange={(val) => {
                          setFormData({
                            ...formData,
                            currentCenter: val,
                            otherCenter: val === 'Other' ? formData.otherCenter : ''
                          });
                        }}
                        placeholder="None / Not Assigned"
                        searchPlaceholder="Search center..."
                        icon={<Building2 className="w-4 h-4 text-gray-400" />}
                        triggerClassName="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
                      />

                      {formData.currentCenter === 'Other' && (
                        <div className="mt-2 p-3 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-2">
                          <label className="block text-[11px] font-bold text-orange-900">Custom Center Name</label>
                          <input
                            type="text"
                            required
                            value={formData.otherCenter}
                            onChange={e => setFormData({ ...formData, otherCenter: e.target.value })}
                            placeholder="e.g. FC Road BACE"
                            className="w-full px-3 py-1.5 bg-white border border-orange-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-200"
                          />
                          {formData.otherCenter.trim() && (
                            <div className="pt-2 border-t border-orange-200/60 flex items-center justify-between gap-2">
                              <p className="text-[11px] text-orange-800">
                                Register as new official center?
                              </p>
                              <button
                                type="button"
                                onClick={handleRegisterNewCenter}
                                disabled={isRegisteringCenter}
                                className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
                              >
                                {isRegisteringCenter ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                <span>Create Center</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Parent Temple */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Parent Temple</label>
                    <SearchableSelect
                      options={parentTempleOptions}
                      value={formData.parentTemple}
                      valueProperty="id"
                      onChange={(val) => {
                        setFormData({
                          ...formData,
                          parentTemple: val,
                          parentCenter: ''
                        });
                      }}
                      placeholder="None / Not Specified"
                      searchPlaceholder="Search parent temple..."
                      icon={<Landmark className="w-4 h-4 text-gray-400" />}
                      triggerClassName="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
                    />
                  </div>

                  {/* Parent Center */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Parent Center</label>
                    <SearchableSelect
                      options={parentCenterOptions}
                      value={formData.parentCenter}
                      valueProperty="id"
                      onChange={(val) => setFormData({ ...formData, parentCenter: val })}
                      placeholder="None / Not Specified"
                      searchPlaceholder="Search parent center..."
                      icon={<Building2 className="w-4 h-4 text-gray-400" />}
                      triggerClassName="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Counselor with Other support */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Assigned Counselor</label>
                  <SearchableSelect
                    options={counselorOptions}
                    value={formData.counselor}
                    valueProperty="id"
                    onChange={(val) => {
                      const selected = counselorsList.find(c => c.name === val);
                      setFormData({
                        ...formData,
                        counselor: val,
                        otherCounselor: val === 'Other' ? formData.otherCounselor : '',
                        counselorId: selected?.id || ''
                      });
                    }}
                    placeholder="None / No Counselor"
                    searchPlaceholder="Search counselor by name, mobile, email, city..."
                    icon={<Users className="w-4 h-4 text-gray-400" />}
                    triggerClassName="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
                  />

                  {formData.counselor === 'Other' && (
                    <div className="mt-2">
                      <label className="block text-[11px] font-bold text-orange-700 mb-1">Specify Other Counselor Name</label>
                      <input
                        type="text"
                        required
                        value={formData.otherCounselor}
                        onChange={e => setFormData({ ...formData, otherCounselor: e.target.value })}
                        placeholder="Enter counselor spiritual or legal name"
                        className="w-full px-3 py-1.5 bg-orange-50/50 border border-orange-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: General Info */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                        placeholder="e.g. Rohini Nandan Das"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                        placeholder="user@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <PhoneInputWithCountry
                      label="Mobile / Phone"
                      value={formData.phone}
                      onChange={(fullPhone) => setFormData({ ...formData, phone: fullPhone })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Birth Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={formData.birthDate}
                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ashram</label>
                    <select
                      value={formData.ashram}
                      onChange={e => {
                        const newAshram = e.target.value;
                        if (newAshram === 'Brahmachari' || newAshram === 'Grihastha') {
                          setFormData({
                            ...formData,
                            ashram: newAshram,
                            currentCenter: '',
                            otherCenter: ''
                          });
                        } else {
                          setFormData({ ...formData, ashram: newAshram });
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                    >
                      {formData.ashram && !ASHRAM_OPTIONS.some(a => a.value === formData.ashram) && (
                        <option value={formData.ashram}>{formData.ashram}</option>
                      )}
                      {ASHRAM_OPTIONS.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Verification Status</label>
                    <select
                      value={formData.verificationStatus}
                      onChange={e => setFormData({ ...formData, verificationStatus: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                    >
                      <option value="pending">Pending Approval</option>
                      <option value="approved">Active / Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Special Permissions / Delegation */}
                <div className="pt-3 border-t border-gray-100">
                  <label className="block text-xs font-bold text-gray-700 mb-2">Special Financial & View Privileges</label>
                  <label className="flex items-start gap-3 p-3.5 bg-amber-50/70 hover:bg-amber-50 border border-amber-200/90 rounded-2xl cursor-pointer transition-colors shadow-sm">
                    <input
                      type="checkbox"
                      checked={!!formData.canViewAllDonations}
                      onChange={e => setFormData({ ...formData, canViewAllDonations: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 accent-amber-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-black text-slate-800">Allow View Access to All Donation Logs</span>
                        <span className="ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                          Read-Only Access
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Grants this user a dedicated <strong>&ldquo;All Donation Logs&rdquo;</strong> page in their sidebar to view all temple collections and behalf devotee receipts. They cannot modify payment gateways or manage devotees.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 3: Spiritual Details */}
            {activeTab === 'spiritual' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Initiation Status</label>
                    <select
                      value={formData.initiationStatus}
                      onChange={e => setFormData({ ...formData, initiationStatus: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                    >
                      <option value="">Not Initiated</option>
                      <option value="aspiring">Aspiring</option>
                      <option value="initiated">Initiated</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Initiated Name</label>
                    <input
                      type="text"
                      value={formData.initiatedName}
                      onChange={e => setFormData({ ...formData, initiatedName: e.target.value })}
                      disabled={formData.initiationStatus !== 'initiated'}
                      placeholder={formData.initiationStatus === 'initiated' ? 'e.g. Radheshyam Das' : 'Requires Initiated status'}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Spiritual Master</label>
                    <SearchableSelect
                      options={spiritualMasterOptions}
                      value={formData.spiritualMasterName}
                      valueProperty="id"
                      onChange={(val) => setFormData({ ...formData, spiritualMasterName: val })}
                      placeholder="Select Spiritual Master"
                      searchPlaceholder="Search spiritual master..."
                      icon={<Sparkles className="w-4 h-4 text-gray-400" />}
                      triggerClassName="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Daily Rounds</label>
                    <input
                      type="number"
                      min="0"
                      max="64"
                      value={formData.rounds}
                      onChange={e => setFormData({ ...formData, rounds: e.target.value })}
                      placeholder="e.g. 16"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Introduced to Krishna Consciousness (Year/Date)</label>
                  <input
                    type="text"
                    value={formData.introducedToKcIn}
                    onChange={e => setFormData({ ...formData, introducedToKcIn: e.target.value })}
                    placeholder="e.g. 2018 or 2018-05"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: Camps & Courses Completion */}
            {activeTab === 'camps' && (
              <div className="space-y-4">
                <div className="p-3 bg-orange-50/60 border border-orange-100 rounded-xl text-xs text-orange-900 font-medium">
                  Check any retreat or course completed by this user to update their training record.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {CAMPS_LIST.map(camp => (
                    <label
                      key={camp.key}
                      className="p-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(formData.camps[camp.key])}
                        onChange={e => {
                          setFormData({
                            ...formData,
                            camps: {
                              ...formData.camps,
                              [camp.key]: e.target.checked
                            }
                          });
                        }}
                        className="w-4 h-4 text-orange-600 rounded-md border-gray-300 focus:ring-orange-500"
                      />
                      <span className="font-semibold text-gray-800">{camp.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
