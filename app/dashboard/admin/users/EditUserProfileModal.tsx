'use client';

import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Phone, Calendar, Landmark, Building2, Users, Sparkles, Check, Loader2 } from 'lucide-react';
import { User, TempleData } from '@/types';
import { CenterData } from '@/lib/supabase/centers';
import { CounselorData } from '@/lib/supabase/counselors';
import { SPIRITUAL_MASTERS } from '@/lib/utils/spiritual-masters';

interface EditUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, updatedData: Partial<User>) => Promise<void>;
  user: User | null;
  templesList: TempleData[];
  centersList: CenterData[];
  counselorsList: CounselorData[];
}

export default function EditUserProfileModal({
  isOpen,
  onClose,
  onSave,
  user,
  templesList,
  centersList,
  counselorsList
}: EditUserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'hierarchy' | 'spiritual'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    verificationStatus: 'approved' as 'approved' | 'pending' | 'rejected',
    currentTemple: '',
    currentCenter: '',
    parentTemple: '',
    parentCenter: '',
    counselor: '',
    counselorId: '',
    initiationStatus: '' as 'initiated' | 'aspiring' | '',
    initiatedName: '',
    spiritualMasterName: '',
    introducedToKcIn: '',
    rounds: ''
  });

  useEffect(() => {
    if (user) {
      const hierarchy = user.hierarchy || {};
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        birthDate: user.birthDate ? String(user.birthDate).split('T')[0] : '',
        verificationStatus: (user.verificationStatus as any) || 'approved',
        currentTemple: hierarchy.currentTemple || user.currentTemple || '',
        currentCenter: hierarchy.currentCenter || hierarchy.center || user.currentCenter || '',
        parentTemple: hierarchy.parentTemple || user.parentTemple || '',
        parentCenter: hierarchy.parentCenter || user.parentCenter || '',
        counselor: hierarchy.counselor || '',
        counselorId: hierarchy.counselorId || hierarchy.counselor_id || '',
        initiationStatus: (hierarchy.initiationStatus as any) || '',
        initiatedName: hierarchy.initiatedName || '',
        spiritualMasterName: hierarchy.spiritualMasterName || '',
        introducedToKcIn: hierarchy.introducedToKcIn || user.introducedToKcIn || '',
        rounds: hierarchy.rounds ? String(hierarchy.rounds) : ''
      });
      setActiveTab('basic');
      setError('');
    }
  }, [user]);

  // Find current temple object
  const currentTempleObj = React.useMemo(() => {
    if (!formData.currentTemple) return null;
    return templesList.find(
      t => t.name?.trim().toLowerCase() === formData.currentTemple.trim().toLowerCase() || t.id === formData.currentTemple
    );
  }, [templesList, formData.currentTemple]);

  // Available current centers strictly for selected current temple
  const availableCurrentCenters = React.useMemo(() => {
    if (!formData.currentTemple || formData.currentTemple === 'None') return [];
    return centersList.filter(c => {
      if (currentTempleObj && c.temple_id && c.temple_id === currentTempleObj.id) return true;
      if (c.temple_id && c.temple_id === formData.currentTemple) return true;
      if (c.temple_name && c.temple_name.trim().toLowerCase() === formData.currentTemple.trim().toLowerCase()) return true;
      return false;
    });
  }, [centersList, formData.currentTemple, currentTempleObj]);

  // Find parent temple object
  const parentTempleObj = React.useMemo(() => {
    if (!formData.parentTemple) return null;
    return templesList.find(
      t => t.name?.trim().toLowerCase() === formData.parentTemple.trim().toLowerCase() || t.id === formData.parentTemple
    );
  }, [templesList, formData.parentTemple]);

  // Available parent centers strictly for selected parent temple
  const availableParentCenters = React.useMemo(() => {
    if (!formData.parentTemple || formData.parentTemple === 'None') return [];
    return centersList.filter(c => {
      if (parentTempleObj && c.temple_id && c.temple_id === parentTempleObj.id) return true;
      if (c.temple_id && c.temple_id === formData.parentTemple) return true;
      if (c.temple_name && c.temple_name.trim().toLowerCase() === formData.parentTemple.trim().toLowerCase()) return true;
      return false;
    });
  }, [centersList, formData.parentTemple, parentTempleObj]);

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

    setIsSaving(true);
    setError('');

    try {
      const updatedHierarchy: any = {
        ...(user.hierarchy || {}),
        currentTemple: formData.currentTemple || null,
        currentCenter: formData.currentCenter || null,
        center: formData.currentCenter || null,
        parentTemple: formData.parentTemple || null,
        parentCenter: formData.parentCenter || null,
        counselor: formData.counselor || null,
        counselorId: formData.counselorId || null,
        counselor_id: formData.counselorId || null,
        initiationStatus: formData.initiationStatus || null,
        initiatedName: formData.initiatedName || null,
        spiritualMasterName: formData.spiritualMasterName || null,
        introducedToKcIn: formData.introducedToKcIn || null,
        rounds: formData.rounds ? parseInt(formData.rounds) || null : null
      };

      const payload: Partial<User> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        birthDate: formData.birthDate || undefined,
        verificationStatus: formData.verificationStatus as any,
        hierarchy: updatedHierarchy,
        currentTemple: formData.currentTemple || undefined,
        currentCenter: formData.currentCenter || undefined,
        parentTemple: formData.parentTemple || undefined,
        parentCenter: formData.parentCenter || undefined,
        introducedToKcIn: formData.introducedToKcIn || undefined
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit User Profile</h2>
            <p className="text-xs text-gray-500 font-medium">
              Update personal, organization, and spiritual details for <span className="font-semibold text-gray-800">{user.name}</span>
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
        <div className="flex border-b border-gray-100 px-6 gap-2 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'basic'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            General Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hierarchy')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'hierarchy'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Center & Temple
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('spiritual')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'spiritual'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Spiritual Details
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* TAB 1: General Info */}
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mobile / Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                      placeholder="10 digit number"
                    />
                  </div>
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

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Verification Status</label>
                <select
                  value={formData.verificationStatus}
                  onChange={e => setFormData({ ...formData, verificationStatus: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                >
                  <option value="approved">Active / Approved</option>
                  <option value="pending">Pending Approval</option>
                  <option value="rejected">Rejected</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Active users can access their dashboard and features normally.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Center & Temple */}
          {activeTab === 'hierarchy' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Current Temple</label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={formData.currentTemple}
                      onChange={e => {
                        const newTemple = e.target.value;
                        setFormData({
                          ...formData,
                          currentTemple: newTemple,
                          currentCenter: ''
                        });
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                    >
                      <option value="">Select Current Temple</option>
                      {templesList.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Current Center</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={formData.currentCenter}
                      onChange={e => setFormData({ ...formData, currentCenter: e.target.value })}
                      disabled={!formData.currentTemple}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!formData.currentTemple
                          ? 'Select Current Temple First'
                          : availableCurrentCenters.length === 0
                            ? 'No centers found for this temple'
                            : 'Select Current Center'}
                      </option>
                      {formData.currentCenter && !availableCurrentCenters.some(c => c.name === formData.currentCenter) && (
                        <option value={formData.currentCenter}>{formData.currentCenter} (Current)</option>
                      )}
                      {availableCurrentCenters.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Parent Temple</label>
                  <select
                    value={formData.parentTemple}
                    onChange={e => {
                      const newParent = e.target.value;
                      setFormData({
                        ...formData,
                        parentTemple: newParent,
                        parentCenter: ''
                      });
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                  >
                    <option value="">Select Parent Temple</option>
                    {templesList.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Parent Center</label>
                  <select
                    value={formData.parentCenter}
                    onChange={e => setFormData({ ...formData, parentCenter: e.target.value })}
                    disabled={!formData.parentTemple}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!formData.parentTemple
                        ? 'Select Parent Temple First'
                        : availableParentCenters.length === 0
                          ? 'No centers found for this temple'
                          : 'Select Parent Center'}
                    </option>
                    {formData.parentCenter && !availableParentCenters.some(c => c.name === formData.parentCenter) && (
                      <option value={formData.parentCenter}>{formData.parentCenter} (Current)</option>
                    )}
                    {availableParentCenters.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Assigned Counselor</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={formData.counselor}
                    onChange={e => {
                      const selected = counselorsList.find(c => c.name === e.target.value);
                      setFormData({
                        ...formData,
                        counselor: e.target.value,
                        counselorId: selected?.id || ''
                      });
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                  >
                    <option value="">None / No Counselor</option>
                    {counselorsList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
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
                  <select
                    value={formData.spiritualMasterName}
                    onChange={e => setFormData({ ...formData, spiritualMasterName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-medium"
                  >
                    <option value="">Select Spiritual Master</option>
                    {SPIRITUAL_MASTERS.map((sm, idx) => (
                      <option key={idx} value={sm}>{sm}</option>
                    ))}
                  </select>
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
